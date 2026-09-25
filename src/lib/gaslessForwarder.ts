/**
 * Gasless auto-forward via EIP-2612 permit — receiver needs 0 ETH.
 * 
 * Flow (sponsor pays gas, fee stays in sponsor wallet 0x9979Df52…):
 * 1. User wallet has USDC on Base, 0 ETH — signs permit off-chain (no gas)
 * 2. Sponsor wallet (0x9979Df52… with Base ETH) submits:
 *    - USDC.permit(user, sponsor, amount, deadline, v,r,s) — sets allowance
 *    - USDC.transferFrom(user, sponsor, amount) — moves USDC to sponsor
 * 3. Sponsor now has USDC, quotes Relay Base USDC -> Tempo pathUSD to user's Tempo address
 * 4. Sponsor keeps sponsorFee (e.g. $0.05) in its own wallet (self-sustaining), deposits rest
 * 5. Solver fills user's Tempo address with pathUSD
 * 
 * Fee stays in sponsor wallet to refill Base ETH for next forwards.
 */

import { createPublicClient, createWalletClient, http, type Address, type Hash, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { relayQuote } from "./relay";

const baseClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const RELAY_DEPOSITORY = "0x4cd00e387622c35bddb9b4c962c136462338bc31" as Address;

const FRIENDLY_FEE_BPS = 100; // 1% = 100 bps, friendly
const FRIENDLY_FEE_MIN_MICRO = 10_000; // $0.01 min
const FRIENDLY_FEE_MAX_MICRO = 100_000; // $0.10 max cap, super friendly

function calculateFriendlyFee(amountMicro: bigint): bigint {
  // 1% of amount, but min $0.01, max $0.10 — friendliest possible while self-sustaining
  const onePercent = (amountMicro * BigInt(FRIENDLY_FEE_BPS)) / 10000n;
  if (onePercent < BigInt(FRIENDLY_FEE_MIN_MICRO)) return BigInt(FRIENDLY_FEE_MIN_MICRO);
  if (onePercent > BigInt(FRIENDLY_FEE_MAX_MICRO)) return BigInt(FRIENDLY_FEE_MAX_MICRO);
  return onePercent;
}

// EIP-2612 permit domain for Base USDC
function getPermitDomain() {
  return {
    name: "USD Coin",
    version: "2",
    chainId: 8453,
    verifyingContract: USDC_BASE,
  } as const;
}

const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export async function signPermit(params: {
  userPrivateKey: `0x${string}`;
  spender: Address;
  value: bigint;
  deadline: bigint;
}): Promise<{ v: number; r: `0x${string}`; s: `0x${string}`; nonce: bigint }> {
  const userAccount = privateKeyToAccount(params.userPrivateKey);
  const nonce = (await baseClient.readContract({
    address: USDC_BASE,
    abi: [
      { type: "function", name: "nonces", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    ] as const,
    functionName: "nonces",
    args: [userAccount.address],
  })) as bigint;

  const signature = await userAccount.signTypedData({
    domain: getPermitDomain(),
    types: PERMIT_TYPES,
    primaryType: "Permit",
    message: {
      owner: userAccount.address,
      spender: params.spender,
      value: params.value,
      nonce,
      deadline: params.deadline,
    },
  });

  // split signature
  const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
  const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
  const v = parseInt(signature.slice(130, 132), 16);

  return { v, r, s, nonce };
}

export async function gaslessForward(params: {
  userPrivateKey: `0x${string}`; // user wallet that has USDC but no ETH
  sponsorPrivateKey: `0x${string}`; // sponsor wallet 0x9979Df52… with Base ETH
  tempoReceiver: Address; // user's Tempo address (same as user address)
  amountMicro?: number; // if not specified, uses full balance
}): Promise<{ requestId: string; baseTxHashes: Hash[]; sponsorFeeMicro: number; forwardedMicro: number }> {
  const userAccount = privateKeyToAccount(params.userPrivateKey);
  const sponsorAccount = privateKeyToAccount(params.sponsorPrivateKey);

  const sponsorWalletClient = createWalletClient({
    account: sponsorAccount,
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  // 1. Get user USDC balance
  const usdcRaw = (await baseClient.readContract({
    address: USDC_BASE,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAccount.address],
  })) as bigint;

  const amount = BigInt(params.amountMicro ?? Number(usdcRaw));
  if (amount < 1_000_000n) throw new Error("min $1 for gasless forward");

  // Friendly fee: 1% min $0.01 max $0.10 — stays in sponsor wallet to refill ETH, self-sustaining
  const sponsorFee = calculateFriendlyFee(amount);
  const forwardAmount = amount - sponsorFee;
  if (forwardAmount < 500_000n) throw new Error("amount too low after friendly fee");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

  // 3. User signs permit for sponsor to spend full amount
  const { v, r, s } = await signPermit({
    userPrivateKey: params.userPrivateKey,
    spender: sponsorAccount.address,
    value: amount,
    deadline,
  });

  const baseTxHashes: Hash[] = [];

  // 4. Sponsor submits permit (pays gas)
  const permitHash = await sponsorWalletClient.writeContract({
    address: USDC_BASE,
    abi: [
      { type: "function", name: "permit", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "v", type: "uint8" }, { name: "r", type: "bytes32" }, { name: "s", type: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
    ] as const,
    functionName: "permit",
    args: [userAccount.address, sponsorAccount.address, amount, deadline, v, r, s],
  });
  baseTxHashes.push(permitHash);
  await baseClient.waitForTransactionReceipt({ hash: permitHash });

  // 5. Sponsor moves USDC from user → sponsor (pays gas)
  const transferHash = await sponsorWalletClient.writeContract({
    address: USDC_BASE,
    abi: erc20Abi,
    functionName: "transferFrom",
    args: [userAccount.address, sponsorAccount.address, amount],
  });
  baseTxHashes.push(transferHash);
  await baseClient.waitForTransactionReceipt({ hash: transferHash });

  // 6. Now sponsor has USDC, keeps fee, forwards rest to Tempo via Relay
  // Check sponsor USDC balance
  const sponsorUsdc = (await baseClient.readContract({
    address: USDC_BASE,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [sponsorAccount.address],
  })) as bigint;

  // Quote Relay: sponsor (as sender) → Tempo pathUSD to tempoReceiver
  const quote = await relayQuote({
    sender: sponsorAccount.address,
    sourceChainId: 8453,
    sourceToken: USDC_BASE,
    amountMicro: Number(forwardAmount),
    receiver: params.tempoReceiver,
  });

  const requestId = quote.steps.find((s) => s.requestId)?.requestId;
  if (!requestId) throw new Error("Relay quote missing requestId");

  // 7. Sponsor executes Relay steps (approve + deposit) — pays gas, fee stays as USDC in sponsor wallet
  for (const step of quote.steps) {
    for (const item of step.items) {
      const d = item.data as { to: Address; data: `0x${string}`; value: string } | undefined;
      if (!d) continue;
      const hash = await sponsorWalletClient.sendTransaction({
        to: d.to,
        data: d.data,
        value: d.value ? BigInt(d.value) : 0n,
      });
      baseTxHashes.push(hash);
      await baseClient.waitForTransactionReceipt({ hash });
    }
  }

  // At this point:
  // - User's Base USDC is 0 (swept)
  // - Sponsor kept sponsorFee USDC ($0.05) on Base — self-sustaining to refill ETH later
  // - User's Tempo address will receive pathUSD via solver

  return {
    requestId,
    baseTxHashes,
    sponsorFeeMicro: Number(sponsorFee),
    forwardedMicro: Number(forwardAmount),
  };
}

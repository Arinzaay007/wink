/**
 * Tempo integration — chains, tokens, memos, faucet, confirmation.
 *
 * We use viem's native Tempo support (`viem/tempo`) plus an explicit
 * TIP-20 ABI for transferWithMemo, so every transfer can carry a
 * 32-byte reconciliation memo.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  pad,
  stringToHex,
  hexToString,
  parseEventLogs,
  keccak256,
  stringToBytes,
  type Hash,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Chain, Addresses } from "viem/tempo";

// ── network ──────────────────────────────────────────────────────────
export type TempoNetwork = "testnet" | "mainnet";

function resolveTempoNetwork(): TempoNetwork {
  const raw =
    (process.env.TEMPO_NETWORK as string | undefined) ||
    (process.env.NEXT_PUBLIC_TEMPO_NETWORK as string | undefined) ||
    "mainnet"; // live business defaults to mainnet — client bundle has no TEMPO_NETWORK
  return raw === "testnet" ? "testnet" : "mainnet";
}

export const TEMPO_NETWORK: TempoNetwork = resolveTempoNetwork();

export const chain =
  TEMPO_NETWORK === "mainnet" ? Chain.tempoMainnet : Chain.tempoModerato;

export const PATH_USD: Address = Addresses.pathUsd; // 0x20c0…0000
export const TOKEN_DECIMALS = 6; // pathUSD = 6 decimals → micro-USD units
export const TOKEN_SYMBOL = "pathUSD";

export const EXPLORER_URL =
  TEMPO_NETWORK === "mainnet"
    ? "https://explore.tempo.xyz"
    : "https://explore.testnet.tempo.xyz";

export const publicClient = createPublicClient({
  chain,
  transport: http(),
});

/** Always-on clients for cross-chain verification (doctrine #5) */
export const publicClientMainnet = createPublicClient({
  chain: Chain.tempoMainnet,
  transport: http(),
});
export const publicClientTestnet = createPublicClient({
  chain: Chain.tempoModerato,
  transport: http(),
});

// Optional platform wallet (testnet fee sponsorship / demos)
export function platformWalletClient() {
  const key = process.env.TEMPO_SPONSOR_KEY as `0x${string}` | undefined;
  if (!key) return null;
  return createWalletClient({
    account: privateKeyToAccount(key),
    chain,
    transport: http(),
  });
}

// ── TIP-20 ABI (the parts we use) ────────────────────────────────────
export const TIP20_ABI = [
  {
    name: "transferWithMemo",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "memo", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "TransferWithMemo",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
      { name: "memo", type: "bytes32", indexed: true },
    ],
  },
] as const;

// ── memos ────────────────────────────────────────────────────────────
/** Encode a short string (≤31 chars) into a 32-byte memo. */
export function encodeMemo(text: string): `0x${string}` {
  return pad(stringToHex(text.slice(0, 31)), { size: 32 });
}

/** Decode a 32-byte memo back to a trimmed string. */
export function decodeMemo(memo: `0x${string}`): string {
  try {
    return hexToString(memo).replace(/\0/g, "").trim();
  } catch {
    return "";
  }
}

/** Build the memo we attach to every wink: wk_<transferId> */
export function winkMemo(transferId: string): string {
  return `wk_${transferId}`.slice(0, 31);
}

// ── faucet (testnet only) ────────────────────────────────────────────
/**
 * Fund an address with 1M of each testnet stablecoin via the
 * tempo_fundAddress RPC method. Testnet only — no-op on mainnet.
 */
export async function fundFromFaucet(address: Address): Promise<unknown> {
  if (TEMPO_NETWORK === "mainnet") {
    throw new Error("Faucet is only available on Tempo testnet");
  }
  return publicClient.request({
    method: "tempo_fundAddress" as never,
    params: [address] as never,
  });
}

// ── reads ────────────────────────────────────────────────────────────
export async function getStableBalance(address: Address): Promise<bigint> {
  return (await publicClient.readContract({
    address: PATH_USD,
    abi: TIP20_ABI,
    functionName: "balanceOf",
    args: [address],
  })) as bigint;
}

// ── confirmation: verify a wink on-chain before trusting it ──────────
export interface OnChainTransfer {
  ok: boolean;
  from?: Address;
  to?: Address;
  valueMicro?: number;
  memo?: string;
  blockNumber?: bigint;
  reason?: string;
}

/**
 * Fetch a receipt and verify the TransferWithMemo event matches our
 * expectation. The chain is the source of truth for money — we never
 * mark a transfer confirmed on client say-so alone.
 */
export async function verifyTransferOnChain(
  txHash: Hash,
  expect: { to: Address; amountMicro: number; memo: string }
): Promise<OnChainTransfer> {
  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  } catch {
    return { ok: false, reason: "receipt-not-found" };
  }
  if (receipt.status !== "success") {
    return { ok: false, reason: "tx-reverted" };
  }
  const logs = parseEventLogs({
    logs: receipt.logs,
    abi: TIP20_ABI,
    eventName: "TransferWithMemo",
  });
  const match = logs.find((l) => {
    const args = l.args as unknown as {
      to: Address;
      value: bigint;
      memo: `0x${string}`;
    };
    return (
      args.to.toLowerCase() === expect.to.toLowerCase() &&
      Number(args.value) === expect.amountMicro &&
      decodeMemo(args.memo) === expect.memo
    );
  });
  if (!match) {
    return { ok: false, reason: "no-matching-transfer-event" };
  }
  const args = match.args as unknown as {
    from: Address;
    to: Address;
    value: bigint;
    memo: `0x${string}`;
  };
  return {
    ok: true,
    from: args.from,
    to: args.to,
    valueMicro: Number(args.value),
    memo: decodeMemo(args.memo),
    blockNumber: receipt.blockNumber,
  };
}

/** Format micro-USD as a human dollar string. */
export function formatMicro(micro: number): string {
  return (micro / 1_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const ERC20_TRANSFER_TOPIC = keccak256(stringToBytes("Transfer(address,address,uint256)"));

/**
 * MPP / open payment check (memo-agnostic): verify a TransferWithMemo
 * event credited `to` with EXACTLY `amountMicro`, whatever memo the
 * payer chose. Returns the payer and decoded memo for the ledger.
 */
export async function verifyPaymentOnChain(
  txHash: Hash,
  expect: { to: Address; amountMicro: number }
): Promise<
  | { ok: true; from: Address; memo: string; blockNumber: bigint }
  | { ok: false; reason: string }
> {
  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  } catch {
    return { ok: false, reason: "receipt-not-found" };
  }
  if (receipt.status !== "success") return { ok: false, reason: "tx-reverted" };

  const logs = parseEventLogs({
    logs: receipt.logs,
    abi: TIP20_ABI,
    eventName: "TransferWithMemo",
  });
  const match = logs.find((l) => {
    const a = l.args as unknown as { to: Address; value: bigint };
    return (
      a.to.toLowerCase() === expect.to.toLowerCase() &&
      Number(a.value) === expect.amountMicro
    );
  });
  if (!match) return { ok: false, reason: "no-matching-payment" };
  const args = match.args as unknown as {
    from: Address;
    value: bigint;
    memo: `0x${string}`;
  };
  return {
    ok: true,
    from: args.from,
    memo: decodeMemo(args.memo),
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Cross-chain arrival check (doctrine #5): after a bridge solver claims it
 * filled a payment on Tempo, we verify independently — scan the
 * destination tx for an ERC-20 Transfer crediting the recipient with at
 * least the expected amount. Solver status APIs are helpful; the chain is
 * the truth. Tries mainnet first (live), then testnet (dev).
 */
export async function verifyArrivalOnTempo(
  txHash: Hash,
  expect: { to: Address; amountMicro: number }
): Promise<{ ok: true; blockNumber: bigint } | { ok: false; reason: string }> {
  for (const client of [publicClientMainnet, publicClientTestnet, publicClient]) {
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") continue;
      const toTopic = pad(expect.to.toLowerCase() as Address).toLowerCase();
      const hit = receipt.logs.find(
        (l) =>
          l.topics[0]?.toLowerCase() === ERC20_TRANSFER_TOPIC.toLowerCase() &&
          l.topics[2]?.toLowerCase() === toTopic &&
          BigInt(l.data || "0x0") >= BigInt(expect.amountMicro)
      );
      if (hit) return { ok: true, blockNumber: receipt.blockNumber };
    } catch {
      continue;
    }
  }
  // final attempt to surface a meaningful reason from the env client
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") return { ok: false, reason: "tx-reverted" };
    return { ok: false, reason: "no-matching-arrival" };
  } catch {
    return { ok: false, reason: "receipt-not-found" };
  }
}

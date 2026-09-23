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
  type Hash,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Chain, Addresses } from "viem/tempo";

// ── network ──────────────────────────────────────────────────────────
export type TempoNetwork = "testnet" | "mainnet";

export const TEMPO_NETWORK: TempoNetwork =
  (process.env.TEMPO_NETWORK as TempoNetwork) === "mainnet"
    ? "mainnet"
    : "testnet";

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

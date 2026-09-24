/**
 * Tempo Zones — private settlement on Tempo (TESTNET PREVIEW).
 *
 * A Zone is an EVM-compatible private chain anchored to Tempo: balances,
 * transfers and history inside are invisible to the public. Deposits lock
 * tokens in a ZonePortal on L1; the zone sequencer credits the recipient
 * privately. Withdrawals hide the sender behind a cryptographic commitment
 * (senderTag) that can be selectively revealed.
 *
 * Stack notes (hard-won):
 *  - zone support ships in `ox/tempo` (ZoneRpcAuthentication, ZoneId) —
 *    already in our dep tree; viem 2.x has no `viem/tempo/zones` yet
 *  - account-scoped zone RPC reads need an X-Authorization-Token header:
 *    signature over keccak(magic ++ version ++ zoneId ++ chainId ++
 *    issuedAt ++ expiresAt) — see ZoneRpcAuthentication.getSignPayload
 *  - Zones are testnet-only and explicitly early; treat as rehearsal-grade
 */
import { ZoneRpcAuthentication } from "ox/tempo";
import {
  defineChain,
  encodeFunctionData,
  pad,
  stringToHex,
  type Address,
  type Chain,
  type Hex,
  type LocalAccount,
} from "viem";
import { PATH_USD, TOKEN_DECIMALS, chain as tempoChain } from "./tempo";

// ── zone registry (Moderato testnet) ────────────────────────────────
export const ZONES = {
  A: {
    id: 6,
    name: "Zone A",
    rpcUrl: "https://rpc-zone-a.testnet.tempo.xyz",
    portal: "0x7069DeC4E64Fd07334A0933eDe836C17259c9B23" as Address,
  },
  B: {
    id: 7,
    name: "Zone B",
    rpcUrl: "https://rpc-zone-b.testnet.tempo.xyz",
    portal: "0x3F5296303400B56271b476F5A0B9cBF74350D6Ac" as Address,
  },
} as const;

export type ZoneKey = keyof typeof ZONES;
export const DEFAULT_ZONE: ZoneKey = "A";

/** zone id 6 → chain id 4217000006 (Tempo mainnet family 4217 * 1e6 + id) */
export function zoneIdToChainId(zoneId: number): number {
  return 4217_000_000 + zoneId;
}

export function zoneChain(key: ZoneKey = DEFAULT_ZONE): Chain {
  const z = ZONES[key];
  return defineChain({
    id: zoneIdToChainId(z.id),
    name: z.name,
    nativeCurrency: { name: "USD", symbol: "USD", decimals: TOKEN_DECIMALS },
    rpcUrls: { default: { http: [z.rpcUrl] } },
  });
}

// ── ZonePortal ABI (the parts we use) ───────────────────────────────
export const ZONE_PORTAL_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint128" },
      { name: "memo", type: "bytes32" },
      { name: "bouncebackRecipient", type: "address" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    name: "sequencerEncryptionKey",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "x", type: "bytes32" },
      { name: "yParity", type: "uint8" },
    ],
  },
  {
    name: "encryptionKeyCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "WithdrawalProcessed",
    type: "event",
    inputs: [
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "senderTag", type: "bytes32" },
      { indexed: false, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint128" },
      { indexed: false, name: "callbackSuccess", type: "bool" },
    ],
  },
] as const;

export const TIP20_MIN_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ── authorization tokens (account-scoped RPC reads) ─────────────────
/**
 * Sign a Zone RPC authorization token with a local account. The token
 * proves control of `account` and scopes every zone RPC response to it.
 * Default TTL: 1 hour (protocol max is 1 month).
 */
export async function signZoneToken(
  account: LocalAccount,
  zoneKey: ZoneKey = DEFAULT_ZONE,
  ttlSeconds = 3600
): Promise<Hex> {
  const zone = ZONES[zoneKey];
  const zoneChainId = zoneIdToChainId(zone.id);
  const issuedAt = Math.floor(Date.now() / 1000);
  const auth = ZoneRpcAuthentication.from({
    chainId: zoneChainId,
    zoneId: zone.id,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  });
  const payload = ZoneRpcAuthentication.getSignPayload(auth);
  if (!account.sign) throw new Error("account cannot sign (need a local key)");
  const signature = await account.sign({ hash: payload });
  return ZoneRpcAuthentication.serialize(auth, { signature });
}

// ── zone RPC (JSON-RPC over HTTP, auth header injected) ─────────────
export async function zoneRpc<T = unknown>(
  zoneKey: ZoneKey,
  method: string,
  params: unknown[] = [],
  token?: Hex
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) headers["X-Authorization-Token"] = token;
  const res = await fetch(ZONES[zoneKey].rpcUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as {
    result?: T;
    error?: { code: number; message: string };
  };
  if (json.error) {
    throw new Error(`zone ${zoneKey} ${method}: ${json.error.code} ${json.error.message}`);
  }
  return json.result as T;
}

/** Public (unauthenticated) zone liveness check. */
export function zoneBlockNumber(zoneKey: ZoneKey = DEFAULT_ZONE) {
  return zoneRpc<string>(zoneKey, "eth_blockNumber");
}

/** Zone metadata as seen by an authenticated account. */
export function zoneInfo(zoneKey: ZoneKey, token: Hex) {
  return zoneRpc<{
    zoneId: number;
    chainId: number;
    sequencer: Address;
    zoneTokens: Address[];
  }>(zoneKey, "zone_getZoneInfo", [], token);
}

/** pathUSD balance of `address` INSIDE the zone (requires its token). */
export async function zoneTokenBalance(
  zoneKey: ZoneKey,
  address: Address,
  token: Hex
): Promise<bigint> {
  const data = encodeFunctionData({
    abi: TIP20_MIN_ABI,
    functionName: "balanceOf",
    args: [address],
  });
  const out = await zoneRpc<string>(
    zoneKey,
    "eth_call",
    [{ to: PATH_USD, data }, "latest"],
    token
  );
  return BigInt(out ?? "0x0");
}

// ── deposit helpers (L1 transactions, signed by the payer) ──────────
export function encodeMemo32(memo: string): Hex {
  return pad(stringToHex(memo.slice(0, 31), { size: 32 }));
}

/** Approve the ZonePortal to pull pathUSD from the payer. */
export function approvePortalCalldata(
  zoneKey: ZoneKey,
  amountMicro: bigint
): { to: Address; data: Hex } {
  return {
    to: PATH_USD,
    data: encodeFunctionData({
      abi: TIP20_MIN_ABI,
      functionName: "approve",
      args: [ZONES[zoneKey].portal, amountMicro],
    }),
  };
}

/**
 * Plaintext deposit: mainnet sees token+amount+sender+recipient(zone addr).
 * Activity INSIDE the zone stays private. (Encrypted deposits — hiding
 * recipient+memo from L1 too — are phase 2.)
 */
export function depositCalldata(opts: {
  zoneKey?: ZoneKey;
  to: Address; // recipient's address inside the zone
  amountMicro: bigint;
  memo?: string;
  bouncebackRecipient: Address; // where funds return if the deposit fails
}): { to: Address; data: Hex } {
  const zoneKey = opts.zoneKey ?? DEFAULT_ZONE;
  return {
    to: ZONES[zoneKey].portal,
    data: encodeFunctionData({
      abi: ZONE_PORTAL_ABI,
      functionName: "deposit",
      args: [
        PATH_USD,
        opts.to,
        opts.amountMicro,
        encodeMemo32(opts.memo ?? "wink"),
        opts.bouncebackRecipient,
      ],
    }),
  };
}

/** Sanity check for UIs: zones exist only on testnet today. */
export function zonesAvailable(): boolean {
  return tempoChain.id === 42431; // Moderato
}

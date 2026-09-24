/**
 * Relay (relay.link) — the cross-chain engine behind doctrine #5:
 * "Any chain in, Tempo out." Intent-based bridging: the sender deposits
 * on the source chain, a solver fills @handle's Tempo address in seconds
 * from local inventory. No lock-and-mint, no message proofs.
 *
 * Tempo's own docs recommend Relay as an integration path (chain 4217).
 * Bungee remains the documented fallback provider.
 *
 * Guardrails (settlement doctrine):
 *  - $5 cross-chain minimum (vs $0.10 Tempo-native)
 *  - $500 per-transfer cap while we're young (solver inventory risk)
 *  - honest latency UX: "settling… minutes", never pretend it's 500ms
 */

const RELAY_API = "https://api.relay.link";

/** Source chains we surface in v1 (all documented Tempo corridors). */
export const SOURCE_CHAINS = [
  { id: 8453, name: "Base", usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  { id: 1, name: "Ethereum", usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  { id: 42161, name: "Arbitrum", usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
  { id: 10, name: "Optimism", usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" },
  { id: 137, name: "Polygon", usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" },
] as const;

export const TEMPO_CHAIN_ID = 4217;
/** What lands on Tempo before the optional pathUSD swap. */
export const TEMPO_USDC_E = "0x20C000000000000000000000b9537d11c60E8b50";

export const BRIDGE_MIN_MICRO = 1_000_000; // $1 live-test floor (was $5 — raise to 5_000_000 at launch)
export const BRIDGE_MAX_MICRO = 500_000_000; // $500 cap (solver inventory)

export type SourceChainId = (typeof SOURCE_CHAINS)[number]["id"];

export interface RelayQuote {
  /** ready-to-sign steps on the SOURCE chain (approve + deposit) */
  steps: {
    kind: string;
    requestId?: string;
    items: { data?: { to: string; data: string; value: string } }[];
  }[];
  /** estimated fees + timing, surfaced honestly in the UI */
  fees?: { total?: { amount?: string; currency?: { decimals?: number } } };
  details?: {
    currencyIn?: { symbol?: string; decimals?: number };
    currencyOut?: { symbol?: string; decimals?: number };
    totalImpact?: string;
    estimatedTime?: number; // seconds
  };
  errors?: { message?: string }[];
}

export interface RelayStatus {
  status: "pending" | "success" | "failure" | "not-found" | string;
  txHashes?: { originTxHashes?: string[]; destinationTxHashes?: string[] };
  progress?: string;
}

export async function relayQuote(params: {
  sender: string; // wallet paying on the source chain
  sourceChainId: SourceChainId;
  sourceToken: string;
  amountMicro: number; // USDC = 6 decimals on every chain we support
  receiver: string; // @handle's Tempo address
}): Promise<RelayQuote> {
  const res = await fetch(`${RELAY_API}/quote/v2`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: params.sender,
      originChainId: params.sourceChainId,
      destinationChainId: TEMPO_CHAIN_ID,
      originCurrency: params.sourceToken,
      destinationCurrency: TEMPO_USDC_E,
      amount: String(params.amountMicro),
      tradeType: "EXACT_INPUT",
    }),
    // never let a hung aggregator stall the pay page
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as RelayQuote | null;
  if (!res.ok || !json) {
    throw new Error(
      (json?.errors?.[0]?.message as string) ?? `route unavailable (${res.status})`,
    );
  }
  return json;
}

export async function relayStatus(requestId: string): Promise<RelayStatus> {
  const res = await fetch(
    `${RELAY_API}/intents/status/v3?requestId=${encodeURIComponent(requestId)}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) return { status: "not-found" };
  return (await res.json()) as RelayStatus;
}

export function sourceChain(id: number) {
  return SOURCE_CHAINS.find((c) => c.id === id);
}

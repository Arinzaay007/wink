/**
 * MPP — Machine Payments Protocol (Tempo × Stripe, IETF draft).
 *
 * Wink as a paywall for the agentic web: any AI agent can buy paid
 * resources from a @handle by settling pathUSD on Tempo, using the
 * standard HTTP 402 challenge → credential → receipt flow.
 *
 *   GET resource            → 402 + WWW-Authenticate: Payment (challenge)
 *   agent pays on Tempo     → TIP-20 transferWithMemo to the creator
 *   GET resource again      → Authorization: Payment <txHash> (credential)
 *   server verifies chain   → 200 + Payment-Receipt
 *
 * Status semantics per spec: 402 = payment needed, 401 = auth failed,
 * 403 = policy denial. We keep them separate.
 */
import { chain, TOKEN_SYMBOL, TEMPO_NETWORK, type TempoNetwork } from "@/lib/tempo";
import type { Address } from "viem";

/** Price of a paid resource, in micro-pathUSD. */
export const MPP_PRICE_MICRO = 250_000; // $0.25

export interface MppChallenge {
  scheme: "tempo";
  intent: "charge";
  realm: string;
  amountMicro: number;
  currency: string;
  recipient: Address;
  chainId: number;
  network: TempoNetwork;
}

/** Build the 402 challenge: header value + machine-readable body. */
export function mppChallenge(recipient: Address, resource: string) {
  const challenge: MppChallenge = {
    scheme: "tempo",
    intent: "charge",
    realm: resource,
    amountMicro: MPP_PRICE_MICRO,
    currency: TOKEN_SYMBOL,
    recipient,
    chainId: chain.id,
    network: TEMPO_NETWORK,
  };

  const header =
    `Payment scheme="tempo", intent="charge", realm="${resource}", ` +
    `amount="${challenge.amountMicro}", currency="${TOKEN_SYMBOL}", ` +
    `recipient="${recipient}", chainId="${chain.id}"`;

  return { challenge, header };
}

/** Parse `Authorization: Payment <credential>` → the on-chain txHash. */
export function parseCredential(
  authHeader: string | null
): `0x${string}` | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Payment\s+(0x[0-9a-fA-F]{64})\s*$/i);
  return m ? (m[1] as `0x${string}`) : null;
}

/** Build the Payment-Receipt header for a settled charge. */
export function mppReceipt(params: {
  reference: string;
  amountMicro: number;
  payer: Address;
}): string {
  return (
    `reference="${params.reference}", amount="${params.amountMicro}", ` +
    `asset="${TOKEN_SYMBOL}", payer="${params.payer}", settled="tempo"`
  );
}

/**
 * Bridge watcher — "any chain in, Tempo out" tracking.
 *
 * A watch follows one cross-chain transfer from origin deposit to
 * independently-verified arrival on Tempo. Two tracking modes:
 *
 *  1. requestId watch — the transfer was quoted via our /api/bridge/quote
 *     (Relay returns a requestId). We poll Relay's status API for
 *     lifecycle progress, but NEVER trust it for settlement.
 *  2. on-chain watch — the user executed the transfer on relay.link
 *     directly (no requestId we can see). We watch Tempo itself for a
 *     Transfer into the receiver address.
 *
 * In BOTH modes the final step is the same: verify the arrival on Tempo
 * (recipient + amount, chain is truth), then credit the product ledger.
 * This module never signs or sends anything — it only reads.
 */
import { and, desc, eq } from "drizzle-orm";
import type { Address, Hash } from "viem";
import type { WinkDb } from "@/db";
import { bridgeWatches, transfers, usernames, users, type BridgeWatch } from "@/db/schema";
import { relayStatus, TEMPO_USDC_E, SOURCE_CHAINS } from "./relay";
import {
  PATH_USD,
  publicClient,
  publicClientMainnet,
  publicClientTestnet,
  verifyArrivalOnTempo,
} from "./tempo";
import { normalizeHandle } from "./handles";
import { notifyFundsReceived } from "./notify";

/** Standard ERC-20 Transfer event (TIP-20 emits it too). */
const TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

/** How far back a fresh on-chain watch scans (~1h at Tempo block times). */
const SCAN_LOOKBACK_BLOCKS = 3600n;
/** A watch older than this stops being actively scanned. */
export const WATCH_TTL_MS = 48 * 60 * 60 * 1000; // 48h

export type WatchStatus = BridgeWatch["status"];

export interface WatchInput {
  requestId?: string | null;
  handle?: string | null;
  receiver: string;
  sourceChain: string;
  amountMicro: number;
}

// ── pure helpers (unit-tested) ───────────────────────────────────────

/** Map a Relay status API response to the watcher lifecycle. */
export function mapRelayStatus(
  status: string
): { watch: "watching" | "verifying" | "failed"; progress: string } {
  switch (status) {
    case "success":
      return { watch: "verifying", progress: "solver filled — verifying on Tempo…" };
    case "failure":
      return { watch: "failed", progress: "Relay reported failure on this route" };
    case "not-found":
      return { watch: "watching", progress: "no Relay record — watching Tempo directly" };
    default:
      return { watch: "watching", progress: "bridging… (Relay: " + status + ")" };
  }
}

export interface ArrivalLog {
  address: string;
  transactionHash: string | null;
  blockNumber: bigint | null;
  args: { to?: Address; value?: bigint };
}

/**
 * Find the first Transfer log paying `receiver` at least `amountMicro`
 * minus reasonable bridge fees. Pure — callers pass logs, which keeps this
 * trivially testable. Allows up to 10% slippage (Relay fees ~0.4%).
 */
export function matchArrivalLogs(
  logs: ArrivalLog[],
  receiver: Address,
  amountMicro: number
): ArrivalLog | null {
  const want = receiver.toLowerCase();
  const minAccept = (BigInt(amountMicro) * 90n) / 100n; // 10% slippage tolerance
  for (const log of logs) {
    if ((log.args.to ?? "").toLowerCase() !== want) continue;
    if ((log.args.value ?? 0n) < minAccept) continue;
    return log;
  }
  return null;
}

/** Human chain label for display ("base" → "Base"). */
export function chainLabel(slug: string): string {
  return (
    SOURCE_CHAINS.find((c) => c.name.toLowerCase() === slug.toLowerCase())?.name ?? slug
  );
}

// ── registration ─────────────────────────────────────────────────────

/** Create (or return the existing) watch for a transfer. Idempotent. */
export async function registerWatch(
  db: WinkDb,
  userId: string,
  input: WatchInput
): Promise<BridgeWatch> {
  if (input.requestId) {
    const existing = await db.query.bridgeWatches.findFirst({
      where: eq(bridgeWatches.requestId, input.requestId),
    });
    if (existing) return existing;
  } else {
    const existing = await db.query.bridgeWatches.findFirst({
      where: and(
        eq(bridgeWatches.userId, userId),
        eq(bridgeWatches.receiver, input.receiver),
        eq(bridgeWatches.amountMicro, input.amountMicro)
      ),
      orderBy: [desc(bridgeWatches.createdAt)],
    });
    if (existing && existing.status !== "confirmed" && existing.status !== "failed")
      return existing;
  }
  const rows = await db
    .insert(bridgeWatches)
    .values({
      userId,
      requestId: input.requestId ?? null,
      handle: input.handle ?? null,
      receiver: input.receiver,
      sourceChain: input.sourceChain.toLowerCase(),
      amountMicro: input.amountMicro,
      progress: "watching for arrival…",
    })
    .returning();
  return rows[0];
}

// ── ledger credit (shared with /api/bridge/status) ──────────────────

/**
 * Write the product ledger row for a verified bridge arrival. Idempotent
 * (keyed by memo). Returns credited=true once the row exists.
 */
export async function creditBridgeArrival(
  db: WinkDb,
  params: {
    requestId?: string | null;
    handle: string;
    receiver: string;
    amountMicro: number;
    chainName: string;
    destTx: Hash;
  }
): Promise<{ credited: boolean; reason?: string }> {
  const memo = params.requestId
    ? `relay:${params.requestId}`
    : `bridge:${params.destTx}`;
  const already = await db.query.transfers.findFirst({ where: eq(transfers.memo, memo) });
  if (already) return { credited: true };

  const name = await db.query.usernames.findFirst({
    where: eq(usernames.handle, normalizeHandle(params.handle)),
  });
  const recipient = name
    ? await db.query.users.findFirst({ where: eq(users.id, name.userId) })
    : null;
  if (!recipient) return { credited: false, reason: "recipient not found" };

  await db.insert(transfers).values({
    kind: "wink",
    chain: params.chainName.toLowerCase(),
    fromAddress: params.requestId ? `bridge:${params.requestId}` : `bridge:${params.destTx}`,
    toUserId: recipient.id,
    toAddress: params.receiver,
    amountMicro: params.amountMicro,
    currency: "USDC.e",
    memo,
    tipperVisibility: "named",
    txHash: params.destTx,
    status: "confirmed",
    confirmedAt: new Date(),
  });

  // notify — ANY funds drop (bridge is one type)
  await notifyFundsReceived(db, {
    toUserId: recipient.id,
    amountMicro: params.amountMicro,
    fromAddress: params.requestId ? `bridge:${params.chainName}` : params.chainName,
    txHash: params.destTx,
    chain: `${params.chainName} → Tempo`,
    handle: params.handle,
  });

  return { credited: true };
}

// ── on-chain arrival scan ────────────────────────────────────────────

/**
 * Watch Tempo directly for a Transfer into the receiver (relay.link
 * manual flows have no requestId we can poll). Scans from the watch's
 * lastScannedBlock, bounded to a lookback window for fresh watches.
 * Tries mainnet first (live funds), then testnet (dev).
 */
export async function scanArrival(db: WinkDb, watch: BridgeWatch): Promise<BridgeWatch> {
  const clients = [publicClientMainnet, publicClientTestnet, publicClient];
  for (const client of clients) {
    try {
      const latest = await client.getBlockNumber();
      const floor = latest - SCAN_LOOKBACK_BLOCKS;
      const from =
        watch.lastScannedBlock != null && BigInt(watch.lastScannedBlock) > floor
          ? BigInt(watch.lastScannedBlock) + 1n
          : floor;
      if (from > latest) continue;

      const logs = await client.getLogs({
        address: [TEMPO_USDC_E as Address, PATH_USD as Address],
        event: TRANSFER_EVENT,
        args: { to: watch.receiver as Address },
        fromBlock: from,
        toBlock: latest,
      });

      const hit = matchArrivalLogs(logs, watch.receiver as Address, watch.amountMicro);
      if (hit) {
        return confirmWatch(db, watch, hit.transactionHash as Hash, Number(hit.blockNumber ?? 0));
      }
    } catch {
      continue;
    }
  }
  // no hit — advance cursor on the env client
  try {
    const latest = await publicClient.getBlockNumber();
    const rows = await db
      .update(bridgeWatches)
      .set({ lastScannedBlock: Number(latest), updatedAt: new Date() })
      .where(eq(bridgeWatches.id, watch.id))
      .returning();
    return rows[0];
  } catch {
    return watch;
  }
}

// ── confirmation ─────────────────────────────────────────────────────

async function confirmWatch(
  db: WinkDb,
  watch: BridgeWatch,
  destTx: Hash,
  blockNumber: number
): Promise<BridgeWatch> {
  if (watch.handle) {
    await creditBridgeArrival(db, {
      requestId: watch.requestId,
      handle: watch.handle,
      receiver: watch.receiver,
      amountMicro: watch.amountMicro,
      chainName: watch.sourceChain,
      destTx,
    });
  }
  const rows = await db
    .update(bridgeWatches)
    .set({
      status: "confirmed",
      progress: "settled on Tempo ✓",
      destTxHash: destTx,
      blockNumber,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(bridgeWatches.id, watch.id))
    .returning();
  return rows[0];
}

// ── the poller ───────────────────────────────────────────────────────

/** Advance one watch to its latest state. Reads only — safe to call often. */
export async function pollWatch(db: WinkDb, watch: BridgeWatch): Promise<BridgeWatch> {
  if (watch.status === "confirmed" || watch.status === "failed") return watch;
  if (Date.now() - watch.createdAt.getTime() > WATCH_TTL_MS) {
    const rows = await db
      .update(bridgeWatches)
      .set({ status: "failed", progress: "watch expired without confirmed arrival", updatedAt: new Date() })
      .where(eq(bridgeWatches.id, watch.id))
      .returning();
    return rows[0];
  }

  // 1) Relay lifecycle, when we have a requestId
  if (watch.requestId) {
    let relay;
    try {
      relay = await relayStatus(watch.requestId);
    } catch {
      relay = { status: "not-found" };
    }
    const mapped = mapRelayStatus(relay.status);

    if (relay.status === "success") {
      const destTx = (relay.txHashes?.destinationTxHashes?.[0] ?? null) as Hash | null;
      if (destTx) {
        const arrived = await verifyArrivalOnTempo(destTx, {
          to: watch.receiver as Address,
          amountMicro: watch.amountMicro,
        });
        if (arrived.ok) return confirmWatch(db, watch, destTx, Number(arrived.blockNumber));
        const rows = await db
          .update(bridgeWatches)
          .set({ status: "verifying", progress: mapped.progress, updatedAt: new Date() })
          .where(eq(bridgeWatches.id, watch.id))
          .returning();
        return rows[0];
      }
    } else if (relay.status === "failure") {
      const rows = await db
        .update(bridgeWatches)
        .set({ status: "failed", progress: mapped.progress, updatedAt: new Date() })
        .where(eq(bridgeWatches.id, watch.id))
        .returning();
      return rows[0];
    } else {
      await db
        .update(bridgeWatches)
        .set({ progress: mapped.progress, updatedAt: new Date() })
        .where(eq(bridgeWatches.id, watch.id));
    }
  }

  // 2) Chain is truth — always cross-check with an on-chain scan
  try {
    return await scanArrival(db, watch);
  } catch {
    return watch; // RPC hiccup — keep prior state, retry next poll
  }
}

/** Poll every active watch for a user; return the fresh list. */
export async function pollUserWatches(db: WinkDb, userId: string): Promise<BridgeWatch[]> {
  const watches = await db.query.bridgeWatches.findMany({
    where: eq(bridgeWatches.userId, userId),
    orderBy: [desc(bridgeWatches.createdAt)],
    limit: 20,
  });
  const polled: BridgeWatch[] = [];
  for (const w of watches.slice(0, 10)) {
    try {
      polled.push(await pollWatch(db, w));
    } catch {
      polled.push(w);
    }
  }
  return watches.length > polled.length ? [...polled, ...watches.slice(10)] : polled;
}

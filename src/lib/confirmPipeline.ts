/**
 * Confirmation pipeline v2 — the reconciler.
 *
 * The happy path confirms synchronously (/api/wink/verify → confirm route).
 * This module exists for every other case: browser closed mid-flight,
 * confirm call lost, RPC hiccup. It sweeps `pending` transfers that carry a
 * txHash, verifies each on-chain, and confirms them idempotently — using
 * the exact same ledger write as the API route (shared confirmTransfer()).
 *
 * It replaces the "webhook" step with a poller: same guarantees, zero new
 * infra, no third-party dependency, no secrets to manage. When Tempo
 * indexer webhooks become available, they can feed the same
 * confirmTransfer() — nothing downstream changes.
 */
import { and, eq, isNotNull, lt } from "drizzle-orm";
import type { WinkDb } from "@/db";
import { transfers, ledgerEntries, payRequests } from "@/db/schema";
import { verifyTransferOnChain } from "@/lib/tempo";
import { notifyFundsReceived } from "@/lib/notify";
import type { Address, Hash } from "viem";

export type TransferRow = typeof transfers.$inferSelect;

export interface ConfirmFacts {
  txHash: string;
  from?: string;
}

/**
 * Idempotent confirm — the single write-path for money confirmation.
 * API route, reconciler and (later) webhooks all go through here, so the
 * ledger can never be written two different ways.
 */
export async function confirmTransfer(
  db: WinkDb,
  transfer: TransferRow,
  facts: ConfirmFacts
): Promise<"confirmed" | "already-confirmed"> {
  if (transfer.status === "confirmed") return "already-confirmed";

  await db
    .update(transfers)
    .set({
      status: "confirmed",
      txHash: facts.txHash,
      fromAddress: facts.from ?? transfer.fromAddress,
      confirmedAt: new Date(),
    })
    .where(eq(transfers.id, transfer.id));

  await db.insert(ledgerEntries).values([
    {
      transferId: transfer.id,
      account: `recipient:${transfer.toUserId}`,
      amountMicro: transfer.amountMicro,
    },
    // platform fee split = 0 for now; the row shape is already in place
    // so a fee can be switched on without schema changes.
  ]);

  // settling a pay request → close it, link the transfer
  if (transfer.payRequestId) {
    await db
      .update(payRequests)
      .set({ status: "paid", transferId: transfer.id, resolvedAt: new Date() })
      .where(eq(payRequests.id, transfer.payRequestId));
  }

  // notification — ANY funds drop → email recipient (shared)
  if (transfer.toUserId) {
    await notifyFundsReceived(db, {
      toUserId: transfer.toUserId,
      amountMicro: transfer.amountMicro,
      fromAddress: facts.from ?? transfer.fromAddress,
      txHash: facts.txHash,
      chain: transfer.chain || "tempo",
      memo: transfer.message || transfer.memo,
    });
  }

  return "confirmed";
}

export type VerifyResult =
  | { ok: true; from?: string }
  | { ok: false; reason: string };

export type VerifyOutcome =
  | { action: "confirm"; from?: string }
  | { action: "retry" } // not final yet — keep pending, check again later
  | { action: "fail"; reason: string }; // definitive — mark failed

export const NOT_FOUND_TIMEOUT_MS = 60 * 60 * 1000; // 1h without mining → give up

/**
 * Decide what to do with a verification result, given how long the transfer
 * has been pending. Pure function → unit-testable without a chain.
 */
export function classifyVerification(
  result: VerifyResult,
  pendingMs: number,
  notFoundTimeoutMs: number = NOT_FOUND_TIMEOUT_MS
): VerifyOutcome {
  if (result.ok) return { action: "confirm", from: result.from };
  switch (result.reason) {
    case "receipt-not-found":
      // tx may simply not be mined yet — unless it's been an age
      return pendingMs >= notFoundTimeoutMs
        ? { action: "fail", reason: "tx-not-found-timeout" }
        : { action: "retry" };
    case "tx-reverted":
    case "no-matching-payment":
    case "no-matching-transfer-event":
      // receipt exists but doesn't match what we expected → definitive
      return { action: "fail", reason: result.reason };
    default:
      return { action: "retry" };
  }
}

export interface ReconcileSummary {
  checked: number;
  confirmed: string[];
  failed: string[];
  pending: string[];
}

export interface ReconcileOptions {
  /** ignore transfers younger than this (avoid racing the UI) */
  minAgeMs?: number;
  /** override the give-up window for receipt-not-found */
  notFoundTimeoutMs?: number;
  /** verify override — tests inject a stub; prod uses the chain */
  verify?: (txHash: Hash, transfer: TransferRow) => Promise<VerifyResult>;
}

/** One reconciliation sweep. Safe to run every few seconds. */
export async function reconcileOnce(
  db: WinkDb,
  opts: ReconcileOptions = {}
): Promise<ReconcileSummary> {
  const { minAgeMs = 10_000, notFoundTimeoutMs = NOT_FOUND_TIMEOUT_MS } = opts;
  const verify =
    opts.verify ??
    (async (txHash: Hash, t: TransferRow) => {
      const r = await verifyTransferOnChain(txHash, {
        to: t.toAddress as Address,
        amountMicro: t.amountMicro,
        memo: t.memo ?? "",
      });
      return r as VerifyResult;
    });

  const cutoff = new Date(Date.now() - minAgeMs);
  const rows = await db
    .select()
    .from(transfers)
    .where(
      and(
        eq(transfers.status, "pending"),
        isNotNull(transfers.txHash),
        lt(transfers.createdAt, cutoff)
      )
    )
    .limit(50);

  const summary: ReconcileSummary = { checked: rows.length, confirmed: [], failed: [], pending: [] };

  for (const t of rows) {
    const pendingMs = Date.now() - t.createdAt.getTime();
    const outcome = classifyVerification(
      await verify(t.txHash as Hash, t),
      pendingMs,
      notFoundTimeoutMs
    );

    if (outcome.action === "confirm") {
      await confirmTransfer(db, t, { txHash: t.txHash!, from: outcome.from });
      summary.confirmed.push(t.id);
    } else if (outcome.action === "fail") {
      await db
        .update(transfers)
        .set({ status: "failed", error: outcome.reason })
        .where(eq(transfers.id, t.id));
      summary.failed.push(t.id);
    } else {
      summary.pending.push(t.id);
    }
  }
  return summary;
}

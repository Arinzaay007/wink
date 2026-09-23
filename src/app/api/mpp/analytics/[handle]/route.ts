import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { usernames, users, wallets, transfers, ledgerEntries } from "@/db/schema";
import { normalizeHandle } from "@/lib/handles";
import { verifyPaymentOnChain, PATH_USD } from "@/lib/tempo";
import {
  mppChallenge,
  parseCredential,
  mppReceipt,
  MPP_PRICE_MICRO,
} from "@/lib/mpp";
import type { Address, Hash } from "viem";

export const runtime = "nodejs";
export const maxDuration = 30;

const KIND = "agent"; // machine-paid transfer, distinct from wink/sale/wage

/**
 * GET /api/mpp/analytics/<handle>
 *
 * A paid resource any AI agent can buy via MPP: the engagement analytics
 * for a @handle. First hit → 402 challenge naming the creator's wallet.
 * The agent pays exactly MPP_PRICE_MICRO pathUSD on Tempo, retries with
 * `Authorization: Payment <txHash>`, and we verify the transfer on-chain
 * before unlocking. Every unlock is recorded on the ledger (kind=agent),
 * so creators literally get paid when agents read about them.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const { handle: raw } = await ctx.params;
  const handle = normalizeHandle(raw);
  const resource = `wink:analytics:${handle}`;

  const name = await db.query.usernames.findFirst({
    where: eq(usernames.handle, handle),
  });
  if (!name) return NextResponse.json({ error: "handle-not-found" }, { status: 404 });
  const creator = await db.query.users.findFirst({ where: eq(users.id, name.userId) });
  if (!creator) return NextResponse.json({ error: "handle-not-found" }, { status: 404 });
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, creator.id),
  });
  if (!wallet)
    return NextResponse.json({ error: "creator-has-no-wallet" }, { status: 409 });

  const recipient = wallet.address as Address;

  // ── credential present → verify on-chain, then deliver ─────────────
  const txHash = parseCredential(req.headers.get("authorization"));
  if (txHash) {
    const result = await verifyPaymentOnChain(txHash as Hash, {
      to: recipient,
      amountMicro: MPP_PRICE_MICRO,
    });
    if (!result.ok) {
      // payment claimed but not verified on-chain → 402 again, with reason
      return NextResponse.json(
        { error: "payment-not-verified", reason: result.reason, challenge: resource },
        { status: 402, headers: { "WWW-Authenticate": mppChallenge(recipient, resource).header } },
      );
    }

    // idempotent ledger write — one unlock per txHash
    const memo = result.memo || `mpp:${txHash.slice(2, 10)}`;
    const existing = await db.query.transfers.findFirst({
      where: eq(transfers.txHash, txHash),
    });
    if (!existing) {
      const [row] = await db
        .insert(transfers)
        .values({
          kind: KIND,
          chain: "tempo",
          fromAddress: result.from,
          toUserId: creator.id,
          toAddress: recipient,
          amountMicro: MPP_PRICE_MICRO,
          currency: "pathUSD",
          memo,
          message: `agent unlocked analytics via MPP`,
          tipperVisibility: "named",
          txHash,
          status: "confirmed",
          confirmedAt: new Date(),
        })
        .returning();
      await db.insert(ledgerEntries).values([
        { transferId: row.id, account: `recipient:${creator.id}`, amountMicro: MPP_PRICE_MICRO },
      ]);
    }

    const analytics = await buildAnalytics(db, creator.id, creator.displayName, handle);
    return NextResponse.json(analytics, {
      status: 200,
      headers: {
        "Payment-Receipt": mppReceipt({
          reference: txHash,
          amountMicro: MPP_PRICE_MICRO,
          payer: result.from,
        }),
        "Cache-Control": "no-store",
      },
    });
  }

  // ── no credential → 402 challenge ──────────────────────────────────
  const { challenge, header } = mppChallenge(recipient, resource);
  return NextResponse.json(
    {
      error: "payment-required",
      message: `Pay ${MPP_PRICE_MICRO / 1_000_000} ${challenge.currency} to @${handle} to unlock analytics.`,
      challenge,
    },
    { status: 402, headers: { "WWW-Authenticate": header } },
  );
}

async function buildAnalytics(
  db: NonNullable<ReturnType<typeof getDb>>,
  userId: string,
  displayName: string | null,
  handle: string
) {
  const rows = await db.query.transfers.findMany({
    where: eq(transfers.toUserId, userId),
    orderBy: desc(transfers.createdAt),
    limit: 200,
  });
  const confirmed = rows.filter((t) => t.status === "confirmed");
  const totalMicro = confirmed.reduce((s, t) => s + t.amountMicro, 0);
  const byKind = confirmed.reduce<Record<string, number>>((acc, t) => {
    acc[t.kind] = (acc[t.kind] ?? 0) + 1;
    return acc;
  }, {});

  return {
    resource: "wink:analytics",
    handle,
    displayName,
    token: "pathUSD",
    paidVia: "MPP (Machine Payments Protocol) on Tempo",
    priceMicro: MPP_PRICE_MICRO,
    totals: {
      receivedMicro: totalMicro,
      receivedUsd: Number((totalMicro / 1_000_000).toFixed(2)),
      payments: confirmed.length,
    },
    byKind,
    lastPaymentAt: confirmed[0]?.createdAt ?? null,
    generatedAt: new Date().toISOString(),
  };
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { transfers, usernames, users } from "@/db/schema";
import { relayStatus } from "@/lib/relay";
import { verifyArrivalOnTempo } from "@/lib/tempo";
import { normalizeHandle } from "@/lib/handles";
import type { Address, Hash } from "viem";

export const runtime = "nodejs";
export const maxDuration = 30;

const Query = z.object({
  requestId: z.string().min(1).max(120),
  handle: z.string().min(1).max(30),
  receiver: z.string().min(42).max(42),
  amountMicro: z.coerce.number().int().positive(),
  chainName: z.string().max(20),
});

/**
 * Track a cross-chain payment. When Relay reports success we do NOT take
 * its word for it — we independently verify the destination tx on Tempo
 * (recipient + amount), then write the ledger row. Chain is truth.
 * Idempotent: one row per bridge request (keyed by relay:<requestId> memo).
 */
export async function GET(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const parsed = Query.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid-query" }, { status: 400 });

  const { requestId, handle: raw, receiver, amountMicro, chainName } = parsed.data;
  const status = await relayStatus(requestId);

  if (status.status !== "success") {
    return NextResponse.json({ status: status.status, progress: status.progress ?? null });
  }

  const destTx = (status.txHashes?.destinationTxHashes?.[0] ?? null) as Hash | null;

  // independent verification on Tempo before we credit anything
  const arrived = destTx
    ? await verifyArrivalOnTempo(destTx, {
        to: receiver as Address,
        amountMicro,
      })
    : { ok: false as const, reason: "no-destination-tx" };

  if (!arrived.ok) {
    return NextResponse.json({
      status: "verifying",
      progress: "solver filled — verifying arrival on Tempo…",
      txHash: destTx,
    });
  }

  const memo = `relay:${requestId}`;
  const already = await db.query.transfers.findFirst({ where: eq(transfers.memo, memo) });

  if (!already) {
    // resolve recipient for the FK (cross-chain pays land in their account)
    const handle = normalizeHandle(raw);
    const name = await db.query.usernames.findFirst({ where: eq(usernames.handle, handle) });
    const recipient = name
      ? await db.query.users.findFirst({ where: eq(users.id, name.userId) })
      : null;
    if (!recipient)
      return NextResponse.json({ status: "verifying", progress: "recipient not found" });

    await db.insert(transfers).values({
      kind: "wink",
      chain: chainName.toLowerCase(), // origin chain — multichain-ready schema
      fromAddress: `bridge:${requestId}`, // origin sender lives on the source chain
      toUserId: recipient.id,
      toAddress: receiver,
      amountMicro,
      currency: "USDC.e",
      memo,
      tipperVisibility: "named",
      txHash: destTx,
      status: "confirmed",
      confirmedAt: new Date(),
    });
  }

  return NextResponse.json({
    status: "confirmed",
    txHash: destTx,
    blockNumber: arrived.blockNumber.toString(),
  });
}

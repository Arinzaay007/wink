import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { transfers } from "@/db/schema";
import { verifyTransferOnChain } from "@/lib/tempo";
import { confirmTransfer } from "@/lib/confirmPipeline";
import type { Address, Hash } from "viem";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  transferId: z.string(),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

/**
 * Confirmation pipeline (W1): client reports the broadcast tx hash →
 * we verify the actual on-chain TransferWithMemo event before marking
 * anything confirmed. The chain is the source of truth for money.
 * (W2: Tempo webhooks replace client polling.)
 */
export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid-body" }, { status: 400 });

  const transfer = await db.query.transfers.findFirst({
    where: eq(transfers.id, parsed.data.transferId),
  });
  if (!transfer) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (transfer.status === "confirmed")
    return NextResponse.json({ status: "confirmed", txHash: transfer.txHash });

  const result = await verifyTransferOnChain(parsed.data.txHash as Hash, {
    to: transfer.toAddress as Address,
    amountMicro: transfer.amountMicro,
    memo: transfer.memo ?? "",
  });

  if (!result.ok) {
    return NextResponse.json(
      { status: "unverified", reason: result.reason },
      { status: 409 }
    );
  }

  // on-chain facts match → confirm via the shared write-path
  // (same idempotent ledger write the reconciler uses)
  await confirmTransfer(db, transfer, {
    txHash: parsed.data.txHash,
    from: result.from,
  });

  return NextResponse.json({
    status: "confirmed",
    txHash: parsed.data.txHash,
    blockNumber: result.blockNumber?.toString(),
  });
}

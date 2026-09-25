import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { transfers } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";
import { PATH_USD, TOKEN_SYMBOL, encodeMemo, winkMemo } from "@/lib/tempo";
import { isAddress } from "viem";

export const runtime = "nodejs";

const Body = z.object({
  toAddress: z.string().refine((v) => isAddress(v), "bad-address"),
  amountMicro: z.number().int().min(100_000).max(1_000_000_000_000), // $0.10 – $1M
  message: z.string().max(140).nullish(),
  fromAddress: z.string().refine((v) => isAddress(v), "bad-from-address"),
});

/**
 * Send pathUSD to any 0x address on Tempo — recipient does NOT need a wink handle.
 * Creates a pending transfer with toUserId = null (external).
 * Uses same memo + verification pipeline as wink.
 */
export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { toAddress, amountMicro, message, fromAddress } = parsed.data;

  const fromUserId = await getSessionUserId(); // can be guest too

  const [transfer] = await db
    .insert(transfers)
    .values({
      kind: "wink", // external send still a wink, but toUserId null
      eventId: null,
      payCodeId: null,
      payRequestId: null,
      fromUserId,
      fromAddress,
      toUserId: null, // external — not on wink
      toAddress,
      amountMicro,
      currency: TOKEN_SYMBOL,
      memo: "",
      message: message?.trim() || null,
      tipperVisibility: "named",
      status: "pending",
    })
    .returning();

  const memo = winkMemo(transfer.id);
  await db.update(transfers).set({ memo }).where(eq(transfers.id, transfer.id));

  return NextResponse.json({
    transferId: transfer.id,
    to: toAddress,
    token: PATH_USD,
    amountMicro,
    memo,
    memoHex: encodeMemo(memo),
  });
}

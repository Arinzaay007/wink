import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress } from "viem";
import { getDb } from "@/db";
import { getSessionUserId } from "@/lib/session";
import { registerWatch, pollUserWatches, chainLabel } from "@/lib/bridgeWatcher";
import { SOURCE_CHAINS } from "@/lib/relay";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  requestId: z.string().min(1).max(120).optional(),
  handle: z.string().min(1).max(30).optional(),
  receiver: z.string().refine((v) => isAddress(v), "bad-receiver"),
  sourceChain: z.string().min(1).max(20),
  amountMicro: z.number().int().positive(),
});

/** GET — list my bridge watches and advance any active ones. */
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const watches = await pollUserWatches(db, userId);
  return NextResponse.json({
    watches: watches.map((w) => ({
      id: w.id,
      requestId: w.requestId,
      handle: w.handle,
      receiver: w.receiver,
      sourceChain: w.sourceChain,
      sourceChainLabel: chainLabel(w.sourceChain),
      amountMicro: w.amountMicro,
      currency: w.currency,
      status: w.status,
      progress: w.progress,
      destTxHash: w.destTxHash,
      blockNumber: w.blockNumber,
      createdAt: w.createdAt,
      confirmedAt: w.confirmedAt,
    })),
  });
}

/** POST — register a watch (our quote flow, or manual relay.link tracking). */
export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const knownChain = SOURCE_CHAINS.some(
    (c) => c.name.toLowerCase() === parsed.data.sourceChain.toLowerCase()
  );
  if (!knownChain)
    return NextResponse.json({ error: "unsupported-source-chain" }, { status: 400 });

  const watch = await registerWatch(db, userId, parsed.data);
  return NextResponse.json({ watch }, { status: 201 });
}

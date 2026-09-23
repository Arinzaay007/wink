import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payRequests } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";

const Body = z.object({
  action: z.enum(["decline"]), // "paid" happens via on-chain settlement
});

/** Payer declines an open request. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const userId = await getSessionUserId();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid-body" }, { status: 400 });

  const request = await db.query.payRequests.findFirst({
    where: eq(payRequests.id, id),
  });
  if (!request) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (request.toUserId !== userId)
    return NextResponse.json({ error: "only-the-payer-can-decline" }, { status: 403 });
  if (request.status !== "open")
    return NextResponse.json({ error: "request-already-resolved" }, { status: 409 });

  await db
    .update(payRequests)
    .set({ status: "declined", resolvedAt: new Date() })
    .where(eq(payRequests.id, id));

  return NextResponse.json({ status: "declined" });
}

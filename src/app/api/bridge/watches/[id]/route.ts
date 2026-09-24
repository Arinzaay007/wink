import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bridgeWatches } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";

/** DELETE — remove one of my watches (e.g. a failed/expired one). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const deleted = await db
    .delete(bridgeWatches)
    .where(and(eq(bridgeWatches.id, id), eq(bridgeWatches.userId, userId)))
    .returning({ id: bridgeWatches.id });
  if (deleted.length === 0)
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

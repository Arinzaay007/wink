/**
 * GET    /api/telegram — is the signed-in owner linked to a Telegram chat?
 * DELETE /api/telegram — unlink (stop notifications) from the app side.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { telegramLinks } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const userId = await getSessionUserId();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await db
    .select({ createdAt: telegramLinks.createdAt })
    .from(telegramLinks)
    .where(eq(telegramLinks.userId, userId));
  return NextResponse.json({ linked: rows.length > 0, linkedAt: rows[0]?.createdAt ?? null });
}

export async function DELETE() {
  const db = getDb();
  const userId = await getSessionUserId();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const res = await db
    .delete(telegramLinks)
    .where(eq(telegramLinks.userId, userId))
    .returning({ id: telegramLinks.id });
  return NextResponse.json({ ok: true, unlinked: res.length > 0 });
}

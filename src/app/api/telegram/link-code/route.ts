/**
 * POST /api/telegram/link-code — mint a one-time code the signed-in owner
 * redeems with `/link <code>` inside the Telegram bot. Codes expire in
 * 15 minutes; minting supersedes the owner's previous unused codes.
 */
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { telegramLinkCodes } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";
import { generateLinkCode, LINK_CODE_TTL_MIN } from "@/lib/telegram";

export const runtime = "nodejs";

export async function POST() {
  const db = getDb();
  const userId = await getSessionUserId();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // supersede any still-open codes for this user
  await db
    .delete(telegramLinkCodes)
    .where(and(eq(telegramLinkCodes.userId, userId), isNull(telegramLinkCodes.usedAt)));

  const code = generateLinkCode();
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MIN * 60_000);
  await db
    .insert(telegramLinkCodes)
    .values({ userId, code, expiresAt });

  return NextResponse.json({ code, expiresAt, ttlMin: LINK_CODE_TTL_MIN });
}

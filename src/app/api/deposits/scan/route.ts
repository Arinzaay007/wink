import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getSessionUserId } from "@/lib/session";
import { scanDirectDeposits } from "@/lib/depositWatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scan Tempo for ANY direct pathUSD deposits to user's wallets
 * and create transfer rows + email notifications.
 * Called from wallet page on load, and can be polled.
 */
export async function POST() {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const result = await scanDirectDeposits(db, userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}

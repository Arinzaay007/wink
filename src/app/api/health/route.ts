import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe — cheap, no cache, safe to hit every 30s.
 * 200 when the app can reach the ledger; 503 when it can't.
 */
export async function GET() {
  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, db: false, reason: "db-not-configured" },
      { status: 503 }
    );
  }
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true, db: true, ts: Date.now() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, db: false, reason: String(e).slice(0, 120) },
      { status: 503 }
    );
  }
}

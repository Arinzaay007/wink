import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { scanDirectDeposits } from "@/lib/depositWatcher";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: scan ALL users for direct deposits → email on any funds drop.
 * Vercel cron or manual trigger: GET /api/cron/deposits?secret=xxx
 */
export async function GET(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });

  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  // allow either CRON_SECRET or open for now (will lock later)
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allUsers = await db.select({ id: users.id }).from(users).limit(200);
  let totalFound = 0;
  let totalNew = 0;

  for (const u of allUsers) {
    try {
      const r = await scanDirectDeposits(db, u.id);
      totalFound += r.found;
      totalNew += r.new;
      // small delay to avoid RPC rate limit
      await new Promise(res => setTimeout(res, 200));
    } catch {}
  }

  return NextResponse.json({ ok: true, scanned: allUsers.length, found: totalFound, new: totalNew });
}

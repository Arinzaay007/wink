/**
 * Bridge watcher loop — sweeps active cross-chain watches and advances them.
 *
 *   npm run bridge:watch
 *
 * Why it exists: a user may close their tab after depositing on Base.
 * The watch keeps tracking via Relay status + independent on-chain verification
 * on Tempo (mainnet first, then testnet). When arrival is proven, it confirms
 * and credits the product ledger. No private keys, read-only.
 *
 * Run alongside reconcile-loop in prod (one process can run both).
 */
import "dotenv/config";
import { getDb } from "@/db";
import { bridgeWatches } from "@/db/schema";
import { and, inArray, lt } from "drizzle-orm";
import { pollWatch, WATCH_TTL_MS } from "@/lib/bridgeWatcher";

const POLL_MS = Number(process.env.BRIDGE_WATCH_INTERVAL_MS ?? 10_000);

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing — bridge watcher needs DB");
    process.exit(1);
  }
  console.log(`🌉 Bridge watcher loop started (every ${POLL_MS / 1000}s)`);

  const tick = async () => {
    const db = getDb();
    if (!db) return;
    try {
      const cutoff = new Date(Date.now() - WATCH_TTL_MS);
      const active = await db.query.bridgeWatches.findMany({
        where: and(
          inArray(bridgeWatches.status, ["watching", "verifying"] as const),
          lt(bridgeWatches.createdAt, new Date()), // always true, but keeps index usage
        ),
        limit: 50,
      });
      // filter TTL in JS (drizzle lt on timestamp already, but double-check)
      const fresh = active.filter((w) => w.createdAt.getTime() > cutoff.getTime());
      if (fresh.length === 0) return;

      let confirmed = 0;
      let failed = 0;
      for (const w of fresh) {
        try {
          const polled = await pollWatch(db, w);
          if (polled.status === "confirmed" && w.status !== "confirmed") confirmed++;
          if (polled.status === "failed" && w.status !== "failed") failed++;
        } catch (e) {
          console.error(`watch ${w.id} poll failed`, e);
        }
      }
      if (confirmed || failed || fresh.length > 5) {
        console.log(
          `sweep: checked=${fresh.length} confirmed+=${confirmed} failed+=${failed}`
        );
      }
    } catch (e) {
      console.error("bridge watcher sweep failed", e);
    }
  };

  const loop = setInterval(tick, POLL_MS);
  const stop = () => {
    clearInterval(loop);
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  await tick();
}

void main();

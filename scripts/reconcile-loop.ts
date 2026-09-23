/**
 * Reconciler runner — sweeps pending transfers and confirms them on-chain.
 *
 *   npm run reconcile
 *
 * Why it exists: if a browser closes between broadcast and the confirm
 * call, the transfer would otherwise sit `pending` forever. This loop is
 * the safety net — every pending row with a txHash gets independently
 * verified on Tempo and confirmed through the same idempotent write-path
 * the API uses. Nothing funds-related is ever trusted off-chain.
 *
 * One process in prod can run both this and the Telegram bot.
 */
import "dotenv/config";
import { getDb } from "@/db";
import { reconcileOnce } from "@/lib/confirmPipeline";

const POLL_MS = Number(process.env.RECONCILE_INTERVAL_MS ?? 10_000);

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — the reconciler needs the Wink database.");
    process.exit(1);
  }

  console.log(`🧹 Wink reconciler started (every ${POLL_MS / 1000}s)`);

  const tick = async () => {
    const db = getDb();
    if (!db) return;
    try {
      const s = await reconcileOnce(db);
      if (s.checked > 0) {
        console.log(
          `sweep: checked=${s.checked} confirmed=${s.confirmed.length}` +
            ` failed=${s.failed.length} still-pending=${s.pending.length}` +
            (s.confirmed.length ? ` [${s.confirmed.join(", ")}]` : "")
        );
      }
    } catch (e) {
      console.error("reconcile sweep failed:", e);
    }
  };

  const loop = setInterval(tick, POLL_MS);
  const stop = () => {
    clearInterval(loop);
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  await tick(); // immediate first sweep
}

void main();

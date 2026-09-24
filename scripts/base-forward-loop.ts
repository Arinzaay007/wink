/**
 * Base auto-forward loop — core: "send to my Base wallet, receive on Tempo"
 *
 * Watches a configured Base address for USDC. When balance appears,
 * automatically bridges to Tempo pathUSD via Relay.
 *
 * Env:
 *   BURNER_PRIVATE_KEY or FORWARDER_PRIVATE_KEY — Base wallet key (gitignored)
 *   FORWARDER_TEMPO_RECEIVER — Tempo address to receive pathUSD (defaults to same as Base)
 *   DATABASE_URL — for bridge watch registration (optional)
 */
import "dotenv/config";
import dotenv from "dotenv";
import { existsSync } from "fs";
import { getDb } from "@/db";
import { autoForwardOnce, getBaseBalances } from "@/lib/baseForwarder";
import type { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", override: true });
if (existsSync("wink/.env.local")) dotenv.config({ path: "wink/.env.local", override: true });

const key = (process.env.BURNER_PRIVATE_KEY || process.env.FORWARDER_PRIVATE_KEY) as `0x${string}` | undefined;
const tempoReceiver = (process.env.FORWARDER_TEMPO_RECEIVER || process.env.TEMPO_RECEIVER) as Address | undefined;

if (!key) {
  console.error("Set BURNER_PRIVATE_KEY in wink/.env.local — see LOCAL-TEST.md");
  process.exit(1);
}

const account = privateKeyToAccount(key);
const receiver = (tempoReceiver ?? account.address) as Address;

console.log(`🔄 Base auto-forwarder started`);
console.log(`   Base wallet: ${account.address}`);
console.log(`   Tempo receiver: ${receiver}`);
console.log(`   Watching Base USDC -> Tempo pathUSD`);

const db = (() => {
  try { return getDb(); } catch { return undefined; }
})();

const POLL_MS = Number(process.env.FORWARDER_INTERVAL_MS ?? 15_000);

async function tick() {
  try {
    const { usdc, eth } = await getBaseBalances(account.address);
    if (usdc === 0) {
      // console.log(`[${new Date().toISOString().slice(11,19)}] Base USDC 0, waiting...`);
      return;
    }
    console.log(`[${new Date().toISOString().slice(11,19)}] Base USDC ${(usdc/1e6).toFixed(2)} detected, ETH ${eth.toFixed(6)} — forwarding to Tempo pathUSD...`);
    const res = await autoForwardOnce({
      db: db ?? undefined,
      privateKey: key,
      tempoReceiver: receiver,
      minMicro: 500_000, // $0.50 min for auto-forward
    });
    if (res) {
      console.log(`✅ Forwarded! requestId ${res.requestId.slice(0,14)}...`);
      console.log(`   Base txs: ${res.baseTxHashes.join(", ").slice(0,120)}`);
      console.log(`   Amount in: ${(res.amountIn/1e6).toFixed(6)} USDC -> expected out ~${res.expectedOut} pathUSD micro`);
      console.log(`   Track at: https://api.relay.link/intents/status/v3?requestId=${res.requestId}`);
    }
  } catch (e) {
    console.error("forward tick failed:", e instanceof Error ? e.message : e);
  }
}

const loop = setInterval(tick, POLL_MS);
process.once("SIGINT", () => { clearInterval(loop); process.exit(0); });
process.once("SIGTERM", () => { clearInterval(loop); process.exit(0); });

await tick();

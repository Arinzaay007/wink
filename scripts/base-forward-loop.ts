/**
 * Multi-chain auto-forward loop — core: "send to my wallet on Base/Eth/Arb/Op/Poly, receive pathUSD on Tempo"
 *
 * Watches ALL supported source chains for USDC. When balance appears,
 * automatically bridges to Tempo pathUSD via Relay.
 *
 * Env:
 *   BURNER_PRIVATE_KEY or FORWARDER_PRIVATE_KEY — wallet key (same address on all EVM chains, gitignored)
 *   FORWARDER_TEMPO_RECEIVER — Tempo address to receive pathUSD (defaults to same as source)
 *   DATABASE_URL — for bridge watch registration (optional)
 */
import "dotenv/config";
import dotenv from "dotenv";
import { existsSync } from "fs";
import { getDb } from "@/db";
import { autoForwardOnce, getAllBalances } from "@/lib/baseForwarder";
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

console.log(`🔄 Multi-chain auto-forwarder started`);
console.log(`   Source wallet (same on all EVMs): ${account.address}`);
console.log(`   Tempo receiver: ${receiver}`);
console.log(`   Watching: Base, Ethereum, Arbitrum, Optimism, Polygon USDC -> Tempo pathUSD`);

const db = (() => {
  try { return getDb(); } catch { return undefined; }
})();

const POLL_MS = Number(process.env.FORWARDER_INTERVAL_MS ?? 15_000);

async function tick() {
  try {
    const all = await getAllBalances(account.address);
    const withFunds = all.filter((b: any) => b.usdcRaw > 0n);
    if (withFunds.length === 0) return;

    for (const bal of withFunds) {
      console.log(`[${new Date().toISOString().slice(11,19)}] ${bal.chainName} USDC ${(bal.usdc/1e6).toFixed(2)} detected, native ${bal.eth.toFixed(6)} — forwarding...`);
      try {
        const res = await autoForwardOnce({
          db: db ?? undefined,
          privateKey: key as `0x${string}`,
          tempoReceiver: receiver,
          sourceChainId: bal.chainId as any,
          minMicro: 500_000,
        });
        if (res) {
          console.log(`✅ ${res.sourceChain} forwarded! requestId ${res.requestId.slice(0,14)}...`);
          console.log(`   Txs: ${res.baseTxHashes.join(", ").slice(0,120)}`);
          console.log(`   ${res.amountIn/1e6} USDC -> ~${res.expectedOut} pathUSD micro`);
        }
      } catch (e) {
        console.error(`  ${bal.chainName} forward failed:`, e instanceof Error ? e.message : e);
      }
    }
  } catch (e) {
    console.error("forward tick failed:", e instanceof Error ? e.message : e);
  }
}

const loop = setInterval(tick, POLL_MS);
process.once("SIGINT", () => { clearInterval(loop); process.exit(0); });
process.once("SIGTERM", () => { clearInterval(loop); process.exit(0); });

await tick();

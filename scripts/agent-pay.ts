/**
 * MPP agent rehearsal tool — plays a real AI-agent payment against the app.
 *
 *   npx tsx scripts/agent-pay.ts [handle]     (default: adaeze)
 *
 * What it does, exactly like an agent in the wild would:
 *   1. GET the paid resource            → HTTP 402 + WWW-Authenticate: Payment
 *   2. spins up a fresh agent wallet and funds it from the testnet faucet
 *   3. pays EXACTLY the challenged amount in pathUSD via transferWithMemo
 *   4. retries with Authorization: Payment <txHash>
 *   5. expects HTTP 200 + Payment-Receipt header + the unlocked resource
 *
 * Every run lands a `kind=agent` row on the ledger, so it also doubles as
 * demo-day rehearsal (plan: ≥10 full runs before the stage moment).
 */
import "dotenv/config";
import { createWalletClient, http, parseEventLogs } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  chain,
  PATH_USD,
  TIP20_ABI,
  encodeMemo,
  fundFromFaucet,
  publicClient,
  EXPLORER_URL,
  getStableBalance,
} from "@/lib/tempo";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const handle = (process.argv[2] ?? "adaeze").toLowerCase().replace(/^@/, "");
const resource = `/api/mpp/analytics/${handle}`;

function step(n: number, msg: string) {
  console.log(`\n[step ${n}] ${msg}`);
}

async function main() {
  step(1, `agent requests ${BASE}${resource} (no credential)`);
  const r1 = await fetch(`${BASE}${resource}`);
  console.log(`  ← HTTP ${r1.status}`);
  console.log(`  WWW-Authenticate: ${r1.headers.get("www-authenticate")}`);
  const body1 = await r1.json().catch(() => null);
  if (r1.status !== 402 || !body1?.challenge) {
    throw new Error(`expected a 402 challenge, got ${r1.status}`);
  }
  const { recipient, amountMicro, currency, chainId } = body1.challenge as {
    recipient: `0x${string}`;
    amountMicro: number;
    currency: string;
    chainId: number;
  };
  console.log(`  challenge: pay ${amountMicro / 1e6} ${currency} → ${recipient} (chain ${chainId})`);

  step(2, "spinning up a fresh agent wallet + faucet funding");
  const key = generatePrivateKey();
  const account = privateKeyToAccount(key);
  console.log(`  agent wallet: ${account.address}`);
  await fundFromFaucet(account.address);
  // faucet credit lands async — poll until the pathUSD shows up
  let bal = 0n;
  for (let i = 0; i < 30; i++) {
    bal = await getStableBalance(account.address);
    if (bal >= BigInt(amountMicro)) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (bal < BigInt(amountMicro)) throw new Error("faucet funding timed out");
  console.log(`  funded: $${Number(bal) / 1e6} pathUSD`);
  const wallet = createWalletClient({ account, chain, transport: http() });

  step(3, `paying exactly $${(amountMicro / 1e6).toFixed(2)} pathUSD with memo`);
  const memo = encodeMemo(`mpp-agent:${handle}`);
  const txHash = await wallet.writeContract({
    address: PATH_USD,
    abi: TIP20_ABI,
    functionName: "transferWithMemo",
    args: [recipient, BigInt(amountMicro), memo],
  });
  console.log(`  tx sent: ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("payment tx reverted");
  const evt = parseEventLogs({ logs: receipt.logs, abi: TIP20_ABI, eventName: "TransferWithMemo" })[0];
  console.log(`  ✅ settled in block ${receipt.blockNumber} — TransferWithMemo(${String(evt?.args.value)} to ${recipient})`);

  step(4, "retrying with Authorization: Payment <txHash>");
  const r2 = await fetch(`${BASE}${resource}`, {
    headers: { authorization: `Payment ${txHash}` },
  });
  console.log(`  ← HTTP ${r2.status}`);
  console.log(`  Payment-Receipt: ${r2.headers.get("payment-receipt")}`);
  const body2 = await r2.json().catch(() => null);

  if (r2.status === 200) {
    step(5, "UNLOCKED — the agent bought the resource 🤖💸");
    console.log(JSON.stringify(body2, null, 2));
    console.log(`\nverify on-chain: ${EXPLORER_URL}/tx/${txHash}`);
    console.log(`(ledger row: kind=agent on @${handle}'s dashboard)`);
  } else {
    step(5, "FAILED — resource stayed locked");
    console.log(JSON.stringify(body2, null, 2));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("\nagent run failed:", e);
  process.exit(1);
});

/**
 * Zone probe v2 — OFFICIAL viem/tempo zone actions end-to-end:
 *
 *   1. fund a throwaway account from the faucet
 *   2. sign a Zone RPC authorization token (Actions.zone.signAuthorizationToken)
 *   3. authenticate against Zone A (chainId + token info + zone info)
 *   4. Actions.zone.depositSync — batched approve+deposit, $1 pathUSD
 *   5. poll the PRIVATE zone balance via authenticated eth_call
 *
 *   npx tsx scripts/zone-probe.ts
 */
import "dotenv/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Actions, Zone } from "viem/tempo";
import {
  chain,
  publicClient,
  fundFromFaucet,
  getStableBalance,
  PATH_USD,
  EXPLORER_URL,
} from "../src/lib/tempo";
import { zoneRpc, zoneTokenBalance, type ZoneKey } from "../src/lib/zones";

const AMOUNT_MICRO = 1_000_000n; // $1.00

function step(n: number, msg: string) {
  console.log(`\n[${n}] ${msg}`);
}

async function main() {
  const account = privateKeyToAccount(generatePrivateKey());
  console.log(`probe account: ${account.address}`);
  const wallet = createWalletClient({ account, chain, transport: http() });

  step(1, "funding from testnet faucet");
  await fundFromFaucet(account.address);
  let bal = 0n;
  for (let i = 0; i < 30; i++) {
    bal = await getStableBalance(account.address);
    if (bal >= AMOUNT_MICRO) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (bal < AMOUNT_MICRO) throw new Error("faucet funding timed out");
  console.log(`  funded: $${Number(bal) / 1e6} pathUSD on L1`);

  step(2, "signing Zone RPC authorization token (official action)");
  const zoneChain = Zone.a;
  const zoneWallet = createWalletClient({
    account,
    chain: zoneChain,
    transport: http(),
  });
  const auth = await Actions.zone.signAuthorizationToken(zoneWallet, {});
  const token = (auth as unknown as { token: `0x${string}` }).token;
  console.log(`  token: ${token.slice(0, 18)}… (${(token.length - 2) / 2} bytes)`);

  step(3, "authenticating against Zone A RPC");
  const chainId = await zoneRpc<string>("A", "eth_chainId", [], token);
  console.log(`  eth_chainId: ${BigInt(chainId)}`);
  const zoneInfo = await zoneRpc<{ zoneId: number; sequencer: string }>(
    "A",
    "zone_getZoneInfo",
    [],
    token
  );
  console.log(`  zone_getZoneInfo: zoneId=${zoneInfo.zoneId} sequencer=${zoneInfo.sequencer}`);

  step(4, "Actions.zone.depositSync — batched approve+deposit, $1 pathUSD");
  const { receipt } = await Actions.zone.depositSync(wallet, {
    account,
    amount: AMOUNT_MICRO,
    token: PATH_USD,
    zoneId: 6,
  } as Parameters<typeof Actions.zone.depositSync>[1]);
  if (receipt.status !== "success") throw new Error("deposit tx reverted");
  console.log(`  deposit confirmed in L1 block ${receipt.blockNumber}`);
  console.log(`  verify: ${EXPLORER_URL}/tx/${receipt.transactionHash}`);

  step(5, "polling PRIVATE zone balance (authenticated read)");
  let zoneBal = 0n;
  for (let i = 0; i < 30; i++) {
    zoneBal = await zoneTokenBalance("A" as ZoneKey, account.address, token);
    if (zoneBal > 0n) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (zoneBal === 0n) {
    console.log("  ⚠ zone balance still 0 — sequencer may be slow; check manually");
    process.exitCode = 1;
    return;
  }

  const l1BalAfter = await getStableBalance(account.address);
  console.log(`\n✅ PRIVATE SETTLEMENT PROVEN`);
  console.log(`  L1 pathUSD:   $${Number(bal) / 1e6} → $${Number(l1BalAfter) / 1e6}`);
  console.log(`  Zone A pathUSD (visible only to us): $${Number(zoneBal) / 1e6}`);
}

main().catch((e) => {
  console.error("\nzone probe failed:", e.shortMessage ?? e.message);
  process.exit(1);
});

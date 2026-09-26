/**
 * Deposit watcher — notify on ANY funds dropping into wallet.
 * Scans Tempo mainnet for pathUSD / USDC.e Transfer events to user's addresses,
 * creates missing transfer rows, and emails recipient.
 *
 * This covers:
 * - direct on-chain transfers (no memo)
 * - transfers from other wallets
 * - any chain that already settled to Tempo but wasn't via our wink/bridge pipeline
 */
import { eq } from "drizzle-orm";
import type { Address, Hash } from "viem";
import type { WinkDb } from "@/db";
import { wallets, transfers, usernames } from "@/db/schema";
import { publicClientMainnet, publicClient, PATH_USD } from "./tempo";
import { TEMPO_USDC_E } from "./relay";
import { notifyFundsReceived } from "./notify";

const TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

const SCAN_BLOCKS = 7200n; // ~2h window, safe for cron + manual scan

export async function scanDirectDeposits(
  db: WinkDb,
  userId: string
): Promise<{ found: number; new: number }> {
  const userWallets = await db.query.wallets.findMany({
    where: eq(wallets.userId, userId),
  });
  if (userWallets.length === 0) return { found: 0, new: 0 };

  const handleRow = await db.query.usernames.findFirst({
    where: eq(usernames.userId, userId),
  });
  const handle = handleRow?.handle || null;

  let found = 0;
  let created = 0;

  // use mainnet client first, fallback to env client
  const clients = [publicClientMainnet, publicClient];
  for (const wallet of userWallets) {
    const addr = wallet.address as Address;
    for (const client of clients) {
      try {
        const latest = await client.getBlockNumber();
        const fromBlock = latest - SCAN_BLOCKS;
        const logs = await client.getLogs({
          address: [PATH_USD as Address, TEMPO_USDC_E as Address],
          event: TRANSFER_EVENT,
          args: { to: addr },
          fromBlock,
          toBlock: latest,
        });

        for (const log of logs) {
          found++;
          const value = (log.args as any).value as bigint | undefined;
          const from = (log.args as any).from as Address | undefined;
          const txHash = log.transactionHash as Hash | null;
          if (!value || value < 100_000n) continue; // dust filter $0.10
          if (!txHash) continue;

          // dedupe by txHash — if we already have this tx, skip
          const existing = await db.query.transfers.findFirst({
            where: eq(transfers.txHash, txHash),
          });
          if (existing) continue;

          // also dedupe by memo bridge pattern? skip, txHash is enough

          // create transfer row — direct deposit, confirmed immediately
          const [row] = await db
            .insert(transfers)
            .values({
              kind: "wink",
              fromAddress: (from as string) || "0x0000000000000000000000000000000000000000",
              toUserId: userId,
              toAddress: addr,
              amountMicro: Number(value),
              currency: "pathUSD",
              memo: `direct:${txHash.slice(0, 12)}`,
              message: null,
              tipperVisibility: "named",
              txHash,
              status: "confirmed",
              confirmedAt: new Date(),
              chain: "tempo",
            })
            .returning();

          if (row) {
            created++;
            // notify — non-blocking
            await notifyFundsReceived(db, {
              toUserId: userId,
              amountMicro: Number(value),
              fromAddress: from as string,
              txHash,
              chain: "tempo",
              handle: handle || undefined,
            });
          }
        }
        // if we got logs from mainnet, don't need to try fallback for this wallet
        if (logs.length > 0) break;
      } catch (e) {
        console.warn("[depositWatcher] scan failed for", addr, e);
        continue;
      }
    }
  }

  return { found, new: created };
}

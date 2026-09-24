import "dotenv/config";
import { getDb } from "../src/db";
import { users, wallets, usernames, bridgeWatches, transfers } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { registerWatch, pollWatch } from "../src/lib/bridgeWatcher";
import { getStableBalance, PATH_USD, TIP20_ABI, chain, fundFromFaucet, publicClient } from "../src/lib/tempo";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import type { Address } from "viem";

const db = getDb()!;
let user = await db.query.users.findFirst({ where: eq(users.id, "usr_arinzaay") });
if (!user) user = await db.query.users.findFirst();
const uname = await db.query.usernames.findFirst({ where: eq(usernames.userId, user!.id) });
const wallet = await db.query.wallets.findFirst({ where: eq(wallets.userId, user!.id) });
const receiver = wallet!.address as Address;

const account = privateKeyToAccount(generatePrivateKey());
const wc = createWalletClient({ account, chain, transport: http() });
console.log("funding", account.address, "->", receiver, "(@"+uname?.handle+")");
await fundFromFaucet(account.address);
let bal=0n;
for(let i=0;i<12;i++){ bal=await getStableBalance(account.address); if(bal>0n) break; await new Promise(r=>setTimeout(r,1200));}
console.log("bal", Number(bal)/1e6);

const AMOUNT = 1_234_567n; // unique
const memo = ("0x" + Buffer.from("probe1234567").toString("hex").padEnd(64,"0")) as `0x${string}`;
const hash = await wc.writeContract({ address: PATH_USD, abi: TIP20_ABI, functionName: "transferWithMemo", args: [receiver, AMOUNT, memo], chain });
console.log("tx", hash);
const receipt = await publicClient.waitForTransactionReceipt({hash});
console.log("mined", receipt.blockNumber.toString(), receipt.status);

const watch = await registerWatch(db, user!.id, { handle: uname?.handle ?? null, receiver, sourceChain: "Base", amountMicro: Number(AMOUNT) });
console.log("watch", watch.id, watch.status);

let polled = watch;
for(let i=0;i<4 && polled.status!=="confirmed"; i++){
  polled = await pollWatch(db, polled);
  console.log(`poll ${i}:`, polled.status, polled.destTxHash?.slice(0,12), polled.blockNumber, polled.progress);
  if(polled.status!=="confirmed") await new Promise(r=>setTimeout(r,1000));
}

const ledger = await db.query.transfers.findFirst({ where: eq(transfers.txHash, hash) });
console.log("ledger by txHash:", ledger ? `found ${ledger.id} $${(ledger.amountMicro/1e6).toFixed(6)}` : "not found");
const byMemo = await db.query.transfers.findFirst({ where: eq(transfers.memo, `bridge:${hash}`) });
console.log("ledger by memo bridge:hash:", !!byMemo);

await db.delete(bridgeWatches).where(eq(bridgeWatches.id, watch.id));
if(ledger) await db.delete(transfers).where(eq(transfers.id, ledger.id));
if(byMemo && byMemo.id!==ledger?.id) await db.delete(transfers).where(eq(transfers.id, byMemo.id));
console.log("cleanup done");
process.exit(0);

/**
 * Unified notification — whenever funds drop in wallet, notify recipient.
 * Used by:
 * - wink direct (confirmPipeline)
 * - bridge (bridgeWatcher creditBridgeArrival)
 * - direct on-chain deposits (depositWatcher)
 * - any future chain
 */
import { eq } from "drizzle-orm";
import type { WinkDb } from "@/db";
import { users, usernames } from "@/db/schema";

export interface DepositNotifyParams {
  toUserId: string;
  amountMicro: number;
  fromAddress?: string | null;
  txHash?: string | null;
  chain?: string;
  memo?: string | null;
  handle?: string | null;
}

export async function notifyFundsReceived(
  db: WinkDb,
  params: DepositNotifyParams
): Promise<void> {
  try {
    if (!params.toUserId) return;
    const userRows = await db.select().from(users).where(eq(users.id, params.toUserId)).limit(1);
    const recipient = userRows[0];
    if (!recipient?.email) return;

    const handleRows = await db.select().from(usernames).where(eq(usernames.userId, params.toUserId)).limit(1);
    const handle = params.handle || handleRows[0]?.handle || "you";

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY || "");
    const amount = (params.amountMicro / 1_000_000).toFixed(2);
    const fromShort = params.fromAddress
      ? `${params.fromAddress.slice(0, 6)}…${params.fromAddress.slice(-4)}`
      : "someone";
    const chainLabel = params.chain ? ` via ${params.chain}` : "";
    const txLink = params.txHash
      ? `<p>Tx: <a href="https://explore.tempo.xyz/tx/${params.txHash}">${params.txHash.slice(0, 10)}…</a></p>`
      : "";
    const memoLine = params.memo ? `<p>Note: ${params.memo}</p>` : "";

    await resend.emails.send({
      from: process.env.WINK_MAIL_FROM || "Wink <no-reply@winkpay.xyz>",
      to: recipient.email,
      subject: `You received $${amount} on Wink`,
      html: `<p>You received <b>$${amount} pathUSD</b>${chainLabel} from ${fromShort}.</p><p>To: @${handle}</p>${memoLine}${txLink}<p><a href="https://www.winkpay.xyz/wallet">View in wallet →</a></p>`,
    });
  } catch (e) {
    console.warn("[notify] email failed", e);
  }
}

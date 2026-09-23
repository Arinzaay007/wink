/**
 * Wink Telegram bot logic — importable without side effects
 * (src/bot/index.ts wires it to long-polling; tests import it directly).
 * Zero custody by design:
 *  - /link <code>  binds a chat to a @handle (code minted in the app by
 *    the signed-in owner — the bot can't claim handles it doesn't own)
 *  - notifications: every confirmed transfer to a linked handle gets a DM —
 *    "You've been winked 😉 $5 from @chidi … Verified on-chain ✅"
 *  - /balance      read-only pathUSD balance of the linked wallet
 *  - /wink         deep-links into the app — sending always happens from
 *    the owner's own wallet; the bot never holds keys
 */
import { Bot } from "grammy";
import { and, eq, gt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, type WinkDb } from "@/db";
import {
  telegramLinks,
  telegramLinkCodes,
  transfers,
  usernames,
  users,
  wallets,
} from "@/db/schema";
import {
  formatWinkNotification,
  isValidLinkCode,
  parseWinkCommand,
} from "@/lib/telegram";
import {
  EXPLORER_URL,
  TEMPO_NETWORK,
  formatMicro,
  getStableBalance,
} from "@/lib/tempo";
import type { Address } from "viem";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const HELP = [
  "😉 Wink — anyone, anywhere, paid with a wink.",
  "",
  "Commands:",
  "/link <code> — connect this chat to your @handle (mint a code in your Wink dashboard)",
  "/whoami — which @handle is this chat linked to",
  "/balance — your pathUSD balance on Tempo",
  "/wink @handle $amount [message] — open the app to wink from your own wallet",
  "/unlink — stop notifications",
].join("\n");

function requireDb(ctx: { reply: (t: string) => unknown }): WinkDb | null {
  const db = getDb();
  if (!db) {
    void ctx.reply("Wink's database isn't configured on this bot yet. Try again shortly.");
    return null;
  }
  return db;
}

async function primaryHandle(db: WinkDb, userId: string): Promise<string | null> {
  const rows = await db
    .select({ handle: usernames.handle })
    .from(usernames)
    .where(eq(usernames.userId, userId))
    .limit(1);
  return rows[0]?.handle ?? null;
}

async function recipientWallet(db: WinkDb, userId: string): Promise<string | null> {
  const rows = await db
    .select({ address: wallets.address })
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);
  return rows[0]?.address ?? null;
}

export function createBot(token: string): Bot {
  const bot = new Bot(token);

  bot.command(["start", "help"], (ctx) => ctx.reply(HELP));

  bot.command("link", async (ctx) => {
    const db = requireDb(ctx);
    if (!db) return;
    const code = (ctx.match ?? "").toString().trim().toUpperCase();
    if (!isValidLinkCode(code)) {
      return ctx.reply("Usage: /link WK-XXXX-XXXX — mint a code from your Wink dashboard (Settings → Telegram).");
    }
    const rows = await db
      .select()
      .from(telegramLinkCodes)
      .where(eq(telegramLinkCodes.code, code));
    const row = rows[0];
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      return ctx.reply("That code has expired or was already used. Mint a fresh one in your dashboard — they live 15 minutes.");
    }
    const chatId = String(ctx.chat.id);
    // one chat ↔ one account; re-linking moves both sides cleanly
    await db.delete(telegramLinks).where(eq(telegramLinks.chatId, chatId));
    await db.delete(telegramLinks).where(eq(telegramLinks.userId, row.userId));
    await db.insert(telegramLinks).values({ userId: row.userId, chatId });
    await db
      .update(telegramLinkCodes)
      .set({ usedAt: new Date() })
      .where(eq(telegramLinkCodes.id, row.id));
    const handle = await primaryHandle(db, row.userId);
    await ctx.reply(
      [
        `Linked ✅ — this chat now receives winks for @${handle ?? "your account"}.`,
        "",
        "Every confirmed payment lands here instantly, verified on Tempo.",
        "You've been winked 😉",
      ].join("\n")
    );
  });

  bot.command("unlink", async (ctx) => {
    const db = requireDb(ctx);
    if (!db) return;
    const res = await db
      .delete(telegramLinks)
      .where(eq(telegramLinks.chatId, String(ctx.chat.id)))
      .returning({ id: telegramLinks.id });
    await ctx.reply(
      res.length > 0
        ? "Unlinked. No more wink notifications here. /link a code anytime to come back."
        : "This chat wasn't linked. Use /link <code> from your Wink dashboard."
    );
  });

  bot.command("whoami", async (ctx) => {
    const db = requireDb(ctx);
    if (!db) return;
    const links = await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.chatId, String(ctx.chat.id)));
    if (!links[0]) return ctx.reply("Not linked yet — mint a code in your Wink dashboard, then /link <code>.");
    const handle = await primaryHandle(db, links[0].userId);
    await ctx.reply(`This chat receives winks for @${handle ?? "?"} ✅`);
  });

  bot.command("balance", async (ctx) => {
    const db = requireDb(ctx);
    if (!db) return;
    const links = await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.chatId, String(ctx.chat.id)));
    if (!links[0]) return ctx.reply("Link first: /link <code> (mint one in your Wink dashboard).");
    const address = await recipientWallet(db, links[0].userId);
    if (!address) return ctx.reply("No wallet on your handle yet — open your dashboard to create one.");
    const bal = await getStableBalance(address as Address);
    await ctx.reply(`💰 $${formatMicro(Number(bal))} pathUSD on Tempo ${TEMPO_NETWORK} (${address.slice(0, 6)}…${address.slice(-4)})`);
  });

  bot.command("wink", async (ctx) => {
    const parsed = parseWinkCommand((ctx.match ?? "").toString());
    if (!parsed.ok) return ctx.reply(parsed.error);
    const { wink } = parsed;
    // Non-custodial by design: the bot never signs. Finish from your wallet:
    await ctx.reply(
      [
        `Wink @${wink.handle} $${formatMicro(wink.amountMicro)}${wink.message ? ` — “${wink.message}”` : ""}`,
        "",
        "Wink never holds your keys, so the last step happens in your own wallet:",
        `${APP_URL}/wink/${wink.handle}`,
      ].join("\n")
    );
  });

  return bot;
}

/** Notify every linked chat about transfers confirmed since its cursor. */
export async function notifyOnce(bot: Bot): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const links = await db.select().from(telegramLinks);
  let sent = 0;

  for (const link of links) {
    const senderHandle = alias(usernames, "sender_handle");
    const senderUser = alias(users, "sender_user");
    const fresh = await db
      .select({
        id: transfers.id,
        kind: transfers.kind,
        amountMicro: transfers.amountMicro,
        message: transfers.message,
        txHash: transfers.txHash,
        visibility: transfers.tipperVisibility,
        confirmedAt: transfers.confirmedAt,
        sHandle: senderHandle.handle,
        sName: senderUser.displayName,
      })
      .from(transfers)
      .leftJoin(senderHandle, eq(senderHandle.userId, transfers.fromUserId))
      .leftJoin(senderUser, eq(senderUser.id, transfers.fromUserId))
      .where(
        and(
          eq(transfers.toUserId, link.userId),
          eq(transfers.status, "confirmed"),
          gt(transfers.confirmedAt, link.lastNotifiedAt)
        )
      )
      .orderBy(transfers.confirmedAt);

    // dedupe (a user could in theory hold several handles)
    const seen = new Set<string>();
    let cursor = link.lastNotifiedAt;
    for (const t of fresh) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      const text = formatWinkNotification({
        kind: t.kind,
        amountMicro: t.amountMicro,
        senderHandle: t.visibility === "named" ? (t.sHandle ?? null) : null,
        senderName: t.visibility === "named" ? null : t.sName,
        message: t.message,
        txHash: t.txHash,
        explorerUrl: EXPLORER_URL,
      });
      try {
        await bot.api.sendMessage(link.chatId, text);
        sent += 1;
      } catch (err) {
        // recipient blocked the bot or chat vanished → drop the link
        const msg = err instanceof Error ? err.message : String(err);
        if (/blocked|chat not found|user is deactivated|forbidden/i.test(msg)) {
          await db.delete(telegramLinks).where(eq(telegramLinks.id, link.id));
          break;
        }
        console.error(`notify failed for link ${link.id}:`, msg);
      }
      if (t.confirmedAt && t.confirmedAt > cursor) cursor = t.confirmedAt;
    }
    if (cursor > link.lastNotifiedAt) {
      await db
        .update(telegramLinks)
        .set({ lastNotifiedAt: cursor })
        .where(eq(telegramLinks.id, link.id));
    }
  }
  return sent;
}

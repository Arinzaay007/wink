/**
 * Wink data model — Drizzle schema (PostgreSQL / Neon)
 *
 * The golden rule:
 *   The chain is the source of truth for money.
 *   This ledger is the source of truth for the product.
 */
import {
  pgTable,
  pgEnum,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  bigint,
  jsonb,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

const id = () => nanoid(16);

// ── enums ────────────────────────────────────────────────────────────
export const walletKindEnum = pgEnum("wallet_kind", [
  "inapp", // browser demo wallet (hackathon) → embedded provider later
  "connected", // user connected their own wallet
  "external", // user pasted an address they control elsewhere
]);

export const transferStatusEnum = pgEnum("transfer_status", [
  "pending",
  "confirmed",
  "failed",
]);

export const tipperVisibilityEnum = pgEnum("tipper_visibility", [
  "named",
  "anonymous",
]);

export const payCodeKindEnum = pgEnum("pay_code_kind", ["tip", "invoice"]);

export const payRequestStatusEnum = pgEnum("pay_request_status", [
  "open",
  "paid",
  "declined",
  "expired",
]);

// ── users & identity (the Wink Name System) ─────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(id),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  // Privacy L1 — social layer controls
  privacyAmountsPublic: boolean("privacy_amounts_public")
    .notNull()
    .default(true),
  privacyFeedPublic: boolean("privacy_feed_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usernames = pgTable(
  "usernames",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // stored lowercase; display casing kept on the user side
    handle: text("handle").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    handleUq: uniqueIndex("usernames_handle_uq").on(t.handle),
    userIdx: index("usernames_user_idx").on(t.userId),
  })
);

// future: handle changes keep the old handle resolving for N days
export const aliases = pgTable(
  "aliases",
  {
    id: text("id").primaryKey().$defaultFn(id),
    handle: text("handle").notNull(),
    usernameId: text("username_id")
      .notNull()
      .references(() => usernames.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    aliasUq: uniqueIndex("aliases_handle_uq").on(t.handle),
  })
);

export const wallets = pgTable(
  "wallets",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    address: text("address").notNull(), // 0x… (EVM) or base58 (Solana)
    // multichain-ready from day one: one handle → many destinations
    chain: text("chain").notNull().default("tempo"), // tempo|base|ethereum|solana|…
    kind: walletKindEnum("kind").notNull().default("inapp"),
    label: text("label"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    addressUq: uniqueIndex("wallets_address_uq").on(t.address),
    userIdx: index("wallets_user_idx").on(t.userId),
  })
);

// ── events wedge: spray walls 🎉 ─────────────────────────────────────
export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey().$defaultFn(id),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(), // /wall/<slug>
    title: text("title").notNull(),
    emoji: text("emoji").notNull().default("🎉"),
    live: boolean("live").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    slugUq: uniqueIndex("events_slug_uq").on(t.slug),
    ownerIdx: index("events_owner_idx").on(t.ownerId),
  })
);

// ── merchant wedge: QR codes & pay links ─────────────────────────────
export const payCodes = pgTable(
  "pay_codes",
  {
    id: text("id").primaryKey().$defaultFn(id),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(), // short public id in the QR/URL
    kind: payCodeKindEnum("kind").notNull().default("tip"),
    // fixed-amount codes (invoices) carry an amount; open tip codes don't
    amountMicro: bigint("amount_micro", { mode: "number" }),
    memo: text("memo"), // e.g. invoice number → auto-reconciliation
    note: text("note"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    slugUq: uniqueIndex("pay_codes_slug_uq").on(t.slug),
  })
);

// ── payouts wedge: pay requests ──────────────────────────────────────
export const payRequests = pgTable(
  "pay_requests",
  {
    id: text("id").primaryKey().$defaultFn(id),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountMicro: bigint("amount_micro", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("pathUSD"),
    note: text("note"),
    status: payRequestStatusEnum("status").notNull().default("open"),
    transferId: text("transfer_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => ({
    toIdx: index("pay_requests_to_idx").on(t.toUserId, t.status),
    fromIdx: index("pay_requests_from_idx").on(t.fromUserId),
  })
);

// ── transfers: every wink, sale, or wage ─────────────────────────────
export const transfers = pgTable(
  "transfers",
  {
    id: text("id").primaryKey().$defaultFn(id),
    payCodeId: text("pay_code_id").references(() => payCodes.id),
    payRequestId: text("pay_request_id").references(() => payRequests.id),
    eventId: text("event_id").references(() => events.id), // spray wall attribution
    kind: text("kind").notNull().default("wink"), // wink | sale | wage
    fromUserId: text("from_user_id").references(() => users.id), // null = guest
    fromAddress: text("from_address").notNull(),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toAddress: text("to_address").notNull(),
    // multichain-ready: origin chain of the incoming asset
    chain: text("chain").notNull().default("tempo"),
    amountMicro: bigint("amount_micro", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("pathUSD"),
    memo: text("memo"), // wink:<transferId> when supported by the tx type
    message: text("message"), // optional public note from the tipper
    tipperVisibility: tipperVisibilityEnum("tipper_visibility")
      .notNull()
      .default("named"),
    txHash: text("tx_hash"),
    status: transferStatusEnum("status").notNull().default("pending"),
    error: text("error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at"),
  },
  (t) => ({
    txHashUq: uniqueIndex("transfers_tx_hash_uq").on(t.txHash),
    toIdx: index("transfers_to_idx").on(t.toUserId, t.createdAt),
    eventIdx: index("transfers_event_idx").on(t.eventId, t.createdAt),
    payReqIdx: index("transfers_pay_request_idx").on(t.payRequestId),
    fromIdx: index("transfers_from_idx").on(t.fromAddress),
    statusIdx: index("transfers_status_idx").on(t.status),
  })
);

// ── immutable double-entry ledger (product source of truth) ──────────
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: text("id").primaryKey().$defaultFn(id),
    transferId: text("transfer_id")
      .notNull()
      .references(() => transfers.id, { onDelete: "cascade" }),
    account: text("account").notNull(), // recipient:<userId> | platform:fees
    amountMicro: bigint("amount_micro", { mode: "number" }).notNull(), // signed
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    transferIdx: index("ledger_transfer_idx").on(t.transferId),
    accountIdx: index("ledger_account_idx").on(t.account),
  })
);

// ── webhook ingestion (idempotent) ───────────────────────────────────
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey().$defaultFn(id),
    source: text("source").notNull().default("tempo"),
    eventType: text("event_type").notNull(),
    payloadHash: text("payload_hash").notNull(),
    payload: jsonb("payload"),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    payloadHashUq: uniqueIndex("webhook_payload_hash_uq").on(t.payloadHash),
  })
);

// ── Telegram notifications ──────────────────────────────────────────
/** A @handle owner who linked their Telegram chat for push notifications. */
export const telegramLinks = pgTable(
  "telegram_links",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: text("chat_id").notNull(),
    // cursor: only notify for transfers confirmed after this timestamp
    lastNotifiedAt: timestamp("last_notified_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userUq: uniqueIndex("telegram_links_user_uq").on(t.userId),
    chatUq: uniqueIndex("telegram_links_chat_uq").on(t.chatId),
  })
);

/** One-time codes minted in the app, redeemed via /link in the bot. */
export const telegramLinkCodes = pgTable(
  "telegram_link_codes",
  {
    id: text("id").primaryKey().$defaultFn(id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    codeUq: uniqueIndex("telegram_link_codes_code_uq").on(t.code),
  })
);

export type User = typeof users.$inferSelect;
export type Username = typeof usernames.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type TelegramLink = typeof telegramLinks.$inferSelect;

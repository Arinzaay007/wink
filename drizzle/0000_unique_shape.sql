CREATE TYPE "public"."pay_code_kind" AS ENUM('tip', 'invoice');--> statement-breakpoint
CREATE TYPE "public"."pay_request_status" AS ENUM('open', 'paid', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."tipper_visibility" AS ENUM('named', 'anonymous');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."wallet_kind" AS ENUM('inapp', 'connected', 'external');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"username_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"emoji" text DEFAULT '🎉' NOT NULL,
	"live" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"transfer_id" text NOT NULL,
	"account" text NOT NULL,
	"amount_micro" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pay_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"slug" text NOT NULL,
	"kind" "pay_code_kind" DEFAULT 'tip' NOT NULL,
	"amount_micro" bigint,
	"memo" text,
	"note" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pay_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"amount_micro" bigint NOT NULL,
	"currency" text DEFAULT 'pathUSD' NOT NULL,
	"note" text,
	"status" "pay_request_status" DEFAULT 'open' NOT NULL,
	"transfer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_link_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_links" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"last_notified_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"pay_code_id" text,
	"pay_request_id" text,
	"event_id" text,
	"kind" text DEFAULT 'wink' NOT NULL,
	"from_user_id" text,
	"from_address" text NOT NULL,
	"to_user_id" text NOT NULL,
	"to_address" text NOT NULL,
	"chain" text DEFAULT 'tempo' NOT NULL,
	"amount_micro" bigint NOT NULL,
	"currency" text DEFAULT 'pathUSD' NOT NULL,
	"memo" text,
	"message" text,
	"tipper_visibility" "tipper_visibility" DEFAULT 'named' NOT NULL,
	"tx_hash" text,
	"status" "transfer_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usernames" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"handle" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"privacy_amounts_public" boolean DEFAULT true NOT NULL,
	"privacy_feed_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"address" text NOT NULL,
	"chain" text DEFAULT 'tempo' NOT NULL,
	"kind" "wallet_kind" DEFAULT 'inapp' NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text DEFAULT 'tempo' NOT NULL,
	"event_type" text NOT NULL,
	"payload_hash" text NOT NULL,
	"payload" jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aliases" ADD CONSTRAINT "aliases_username_id_usernames_id_fk" FOREIGN KEY ("username_id") REFERENCES "public"."usernames"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transfer_id_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pay_codes" ADD CONSTRAINT "pay_codes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pay_requests" ADD CONSTRAINT "pay_requests_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pay_requests" ADD CONSTRAINT "pay_requests_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfers" ADD CONSTRAINT "transfers_pay_code_id_pay_codes_id_fk" FOREIGN KEY ("pay_code_id") REFERENCES "public"."pay_codes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfers" ADD CONSTRAINT "transfers_pay_request_id_pay_requests_id_fk" FOREIGN KEY ("pay_request_id") REFERENCES "public"."pay_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfers" ADD CONSTRAINT "transfers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfers" ADD CONSTRAINT "transfers_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfers" ADD CONSTRAINT "transfers_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usernames" ADD CONSTRAINT "usernames_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "aliases_handle_uq" ON "aliases" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "events_slug_uq" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_owner_idx" ON "events" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_transfer_idx" ON "ledger_entries" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_account_idx" ON "ledger_entries" USING btree ("account");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pay_codes_slug_uq" ON "pay_codes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_requests_to_idx" ON "pay_requests" USING btree ("to_user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_requests_from_idx" ON "pay_requests" USING btree ("from_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "telegram_link_codes_code_uq" ON "telegram_link_codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "telegram_links_user_uq" ON "telegram_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "telegram_links_chat_uq" ON "telegram_links" USING btree ("chat_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transfers_tx_hash_uq" ON "transfers" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_to_idx" ON "transfers" USING btree ("to_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_event_idx" ON "transfers" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_pay_request_idx" ON "transfers" USING btree ("pay_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_from_idx" ON "transfers" USING btree ("from_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_status_idx" ON "transfers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usernames_handle_uq" ON "usernames" USING btree ("handle");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usernames_user_idx" ON "usernames" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_address_uq" ON "wallets" USING btree ("address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallets_user_idx" ON "wallets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_payload_hash_uq" ON "webhook_events" USING btree ("payload_hash");
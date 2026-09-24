CREATE TYPE "public"."bridge_watch_status" AS ENUM('watching', 'verifying', 'confirmed', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bridge_watches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"request_id" text,
	"handle" text,
	"receiver" text NOT NULL,
	"source_chain" text NOT NULL,
	"amount_micro" bigint NOT NULL,
	"currency" text DEFAULT 'USDC.e' NOT NULL,
	"status" "bridge_watch_status" DEFAULT 'watching' NOT NULL,
	"progress" text,
	"dest_tx_hash" text,
	"block_number" bigint,
	"last_scanned_block" bigint,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bridge_watches" ADD CONSTRAINT "bridge_watches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bridge_watches_request_id_uq" ON "bridge_watches" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bridge_watches_user_idx" ON "bridge_watches" USING btree ("user_id","created_at");
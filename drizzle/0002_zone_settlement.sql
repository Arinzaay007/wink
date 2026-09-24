ALTER TABLE "transfers" ADD COLUMN "settlement" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "zone_id" bigint;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "zone_tx_hash" text;
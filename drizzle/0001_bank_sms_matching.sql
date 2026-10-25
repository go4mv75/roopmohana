CREATE TABLE "bank_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"utr" text NOT NULL,
	"amount" integer NOT NULL,
	"payer" text,
	"sender" text NOT NULL,
	"raw_text" text NOT NULL,
	"order_id" text,
	"status" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "upi_offset" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bank_credits" ADD CONSTRAINT "bank_credits_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bank_credits_utr_idx" ON "bank_credits" USING btree ("utr");
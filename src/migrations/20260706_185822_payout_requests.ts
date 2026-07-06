import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * New `payout_requests` collection — tutor bank-withdrawal requests with an
 * admin approval lifecycle. (Hand-written & guarded; the auto-generated diff was
 * polluted with earlier hand-written migrations' changes.)
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_payout_requests_currency" AS ENUM('ngn', 'usd');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_payout_requests_status" AS ENUM('requested', 'paid', 'rejected');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE TABLE IF NOT EXISTS "payout_requests" (
    "id" serial PRIMARY KEY NOT NULL,
    "tutor_id" integer NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "enum_payout_requests_currency" DEFAULT 'ngn' NOT NULL,
    "bank_name" varchar,
    "account_number" varchar,
    "account_name" varchar,
    "status" "enum_payout_requests_status" DEFAULT 'requested' NOT NULL,
    "transaction_id" integer,
    "admin_note" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  DO $$ BEGIN
    ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_tutor_id_users_id_fk"
      FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_transaction_id_transactions_id_fk"
      FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE INDEX IF NOT EXISTS "payout_requests_tutor_idx" ON "payout_requests" USING btree ("tutor_id");
  CREATE INDEX IF NOT EXISTS "payout_requests_status_idx" ON "payout_requests" USING btree ("status");
  CREATE INDEX IF NOT EXISTS "payout_requests_transaction_idx" ON "payout_requests" USING btree ("transaction_id");
  CREATE INDEX IF NOT EXISTS "payout_requests_updated_at_idx" ON "payout_requests" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payout_requests_created_at_idx" ON "payout_requests" USING btree ("created_at");

  -- Admin "locked documents" relation for the new collection.
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "payout_requests_id" integer;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payout_requests_fk"
      FOREIGN KEY ("payout_requests_id") REFERENCES "public"."payout_requests"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_payout_requests_id_idx"
    ON "payload_locked_documents_rels" USING btree ("payout_requests_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "payload_locked_documents_rels_payout_requests_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_payout_requests_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "payout_requests_id";
  DROP TABLE IF EXISTS "payout_requests";
  DROP TYPE IF EXISTS "enum_payout_requests_status";
  DROP TYPE IF EXISTS "enum_payout_requests_currency";
  `)
}

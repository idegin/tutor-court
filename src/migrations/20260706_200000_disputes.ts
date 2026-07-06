import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * New `disputes` collection — a booker-raised dispute on a funded engagement with
 * an admin resolution lifecycle (refund / release / reject). Opening a dispute
 * freezes the booking's escrow until it is resolved. (Hand-written & guarded.)
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_disputes_reason" AS ENUM('no_show', 'quality', 'scheduling', 'other');
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    CREATE TYPE "public"."enum_disputes_status" AS ENUM('open', 'resolved_refund', 'resolved_release', 'rejected');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE TABLE IF NOT EXISTS "disputes" (
    "id" serial PRIMARY KEY NOT NULL,
    "booking_id" integer NOT NULL,
    "raised_by_id" integer NOT NULL,
    "against_id" integer,
    "reason" "enum_disputes_reason" NOT NULL,
    "details" varchar NOT NULL,
    "status" "enum_disputes_status" DEFAULT 'open' NOT NULL,
    "resolution_note" varchar,
    "resolved_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  DO $$ BEGIN
    ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_bookings_id_fk"
      FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_id_users_id_fk"
      FOREIGN KEY ("raised_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    ALTER TABLE "disputes" ADD CONSTRAINT "disputes_against_id_users_id_fk"
      FOREIGN KEY ("against_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
    ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_id_users_id_fk"
      FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE INDEX IF NOT EXISTS "disputes_booking_idx" ON "disputes" USING btree ("booking_id");
  CREATE INDEX IF NOT EXISTS "disputes_raised_by_idx" ON "disputes" USING btree ("raised_by_id");
  CREATE INDEX IF NOT EXISTS "disputes_against_idx" ON "disputes" USING btree ("against_id");
  CREATE INDEX IF NOT EXISTS "disputes_status_idx" ON "disputes" USING btree ("status");
  CREATE INDEX IF NOT EXISTS "disputes_updated_at_idx" ON "disputes" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "disputes_created_at_idx" ON "disputes" USING btree ("created_at");
  -- At most one OPEN dispute per booking (mirrors the app-level guard).
  CREATE UNIQUE INDEX IF NOT EXISTS "disputes_one_open_per_booking_idx"
    ON "disputes" ("booking_id") WHERE "status" = 'open';

  -- Admin "locked documents" relation for the new collection.
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "disputes_id" integer;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_disputes_fk"
      FOREIGN KEY ("disputes_id") REFERENCES "public"."disputes"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_disputes_id_idx"
    ON "payload_locked_documents_rels" USING btree ("disputes_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "payload_locked_documents_rels_disputes_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_disputes_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "disputes_id";
  DROP TABLE IF EXISTS "disputes";
  DROP TYPE IF EXISTS "enum_disputes_status";
  DROP TYPE IF EXISTS "enum_disputes_reason";
  `)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // enum_payout_requests_transfer_status may already exist from 20260808 migration
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_payout_requests_transfer_status" AS ENUM('none', 'processing', 'success', 'failed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `)

  // enum value additions — postgres silently errors if value already exists; wrap each
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_bookings_status" ADD VALUE IF NOT EXISTS 'awaiting_release' BEFORE 'completed';
    EXCEPTION WHEN others THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_assessment_questions_type" ADD VALUE IF NOT EXISTS 'flashcard';
    EXCEPTION WHEN others THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_activity_logs_type" ADD VALUE IF NOT EXISTS 'assessment_graded' BEFORE 'class_joined';
    EXCEPTION WHEN others THEN null; END $$;
  `)

  // Drop users_sessions if it still exists
  await db.execute(sql`DROP TABLE IF EXISTS "users_sessions" CASCADE;`)

  // tutor_profiles columns
  await db.execute(sql`ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false;`)
  await db.execute(sql`ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "payout_bank_code" varchar;`)
  await db.execute(sql`ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "payout_bank_name" varchar;`)
  await db.execute(sql`ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "payout_account_number" varchar;`)
  await db.execute(sql`ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "payout_account_name" varchar;`)
  await db.execute(sql`ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "payout_recipient_code" varchar;`)
  await db.execute(sql`ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "rejection_reason" varchar;`)

  // subjects new columns
  await db.execute(sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "short_description" varchar;`)
  await db.execute(sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "description" varchar;`)
  await db.execute(sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "image_id" integer;`)
  await db.execute(sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "icon" varchar;`)
  await db.execute(sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "color" varchar;`)
  await db.execute(sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "sort_order" numeric DEFAULT 0;`)
  await db.execute(sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "is_popular" boolean DEFAULT false;`)
  await db.execute(sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "seo_title" varchar;`)
  await db.execute(sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "seo_description" varchar;`)

  // subject_categories new columns
  await db.execute(sql`ALTER TABLE "subject_categories" ADD COLUMN IF NOT EXISTS "description" varchar;`)
  await db.execute(sql`ALTER TABLE "subject_categories" ADD COLUMN IF NOT EXISTS "icon" varchar;`)
  await db.execute(sql`ALTER TABLE "subject_categories" ADD COLUMN IF NOT EXISTS "color" varchar;`)

  // payout_requests columns
  await db.execute(sql`ALTER TABLE "payout_requests" ADD COLUMN IF NOT EXISTS "recipient_code" varchar;`)
  await db.execute(sql`ALTER TABLE "payout_requests" ADD COLUMN IF NOT EXISTS "transfer_reference" varchar;`)
  await db.execute(sql`ALTER TABLE "payout_requests" ADD COLUMN IF NOT EXISTS "transfer_code" varchar;`)
  await db.execute(sql`ALTER TABLE "payout_requests" ADD COLUMN IF NOT EXISTS "transfer_status" "enum_payout_requests_transfer_status";`)

  // other table columns
  await db.execute(sql`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "awaiting_release_at" timestamp(3) with time zone;`)
  await db.execute(sql`ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "last_heartbeat_at" timestamp(3) with time zone;`)
  await db.execute(sql`ALTER TABLE "live_session_participants" ADD COLUMN IF NOT EXISTS "sfu_session_id" varchar;`)
  await db.execute(sql`ALTER TABLE "assessment_questions" ADD COLUMN IF NOT EXISTS "back_text" varchar;`)
  await db.execute(sql`ALTER TABLE "assessment_results" ADD COLUMN IF NOT EXISTS "mastery" numeric DEFAULT 0;`)

  // FK + indexes (all IF NOT EXISTS)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "subjects" ADD CONSTRAINT "subjects_image_id_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "tutor_profiles_is_verified_idx" ON "tutor_profiles" USING btree ("is_verified");`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "tutor_profiles_payout_recipient_code_idx" ON "tutor_profiles" USING btree ("payout_recipient_code");`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "subjects_image_idx" ON "subjects" USING btree ("image_id");`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "payout_requests_transfer_reference_idx" ON "payout_requests" USING btree ("transfer_reference");`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "bookings_awaiting_release_at_idx" ON "bookings" USING btree ("awaiting_release_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "subjects" DROP COLUMN IF EXISTS "short_description";`)
  await db.execute(sql`ALTER TABLE "subjects" DROP COLUMN IF EXISTS "description";`)
  await db.execute(sql`ALTER TABLE "subjects" DROP COLUMN IF EXISTS "image_id";`)
  await db.execute(sql`ALTER TABLE "subjects" DROP COLUMN IF EXISTS "icon";`)
  await db.execute(sql`ALTER TABLE "subjects" DROP COLUMN IF EXISTS "color";`)
  await db.execute(sql`ALTER TABLE "subjects" DROP COLUMN IF EXISTS "sort_order";`)
  await db.execute(sql`ALTER TABLE "subjects" DROP COLUMN IF EXISTS "is_popular";`)
  await db.execute(sql`ALTER TABLE "subjects" DROP COLUMN IF EXISTS "seo_title";`)
  await db.execute(sql`ALTER TABLE "subjects" DROP COLUMN IF EXISTS "seo_description";`)
  await db.execute(sql`ALTER TABLE "subject_categories" DROP COLUMN IF EXISTS "description";`)
  await db.execute(sql`ALTER TABLE "subject_categories" DROP COLUMN IF EXISTS "icon";`)
  await db.execute(sql`ALTER TABLE "subject_categories" DROP COLUMN IF EXISTS "color";`)
  await db.execute(sql`ALTER TABLE "live_sessions" DROP COLUMN IF EXISTS "last_heartbeat_at";`)
  await db.execute(sql`ALTER TABLE "live_session_participants" DROP COLUMN IF EXISTS "sfu_session_id";`)
  await db.execute(sql`ALTER TABLE "assessment_questions" DROP COLUMN IF EXISTS "back_text";`)
  await db.execute(sql`ALTER TABLE "assessment_results" DROP COLUMN IF EXISTS "mastery";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payout_requests_transfer_status" AS ENUM('none', 'processing', 'success', 'failed');
  ALTER TYPE "public"."enum_bookings_status" ADD VALUE 'awaiting_release' BEFORE 'completed';
  ALTER TYPE "public"."enum_assessment_questions_type" ADD VALUE 'flashcard';
  ALTER TYPE "public"."enum_activity_logs_type" ADD VALUE 'assessment_graded' BEFORE 'class_joined';
  ALTER TABLE "users_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "users_sessions" CASCADE;
  ALTER TABLE "tutor_profiles" ADD COLUMN "is_verified" boolean DEFAULT false;
  ALTER TABLE "tutor_profiles" ADD COLUMN "payout_bank_code" varchar;
  ALTER TABLE "tutor_profiles" ADD COLUMN "payout_bank_name" varchar;
  ALTER TABLE "tutor_profiles" ADD COLUMN "payout_account_number" varchar;
  ALTER TABLE "tutor_profiles" ADD COLUMN "payout_account_name" varchar;
  ALTER TABLE "tutor_profiles" ADD COLUMN "payout_recipient_code" varchar;
  ALTER TABLE "tutor_profiles" ADD COLUMN "rejection_reason" varchar;
  ALTER TABLE "subjects" ADD COLUMN "short_description" varchar;
  ALTER TABLE "subjects" ADD COLUMN "description" varchar;
  ALTER TABLE "subjects" ADD COLUMN "image_id" integer;
  ALTER TABLE "subjects" ADD COLUMN "icon" varchar;
  ALTER TABLE "subjects" ADD COLUMN "color" varchar;
  ALTER TABLE "subjects" ADD COLUMN "sort_order" numeric DEFAULT 0;
  ALTER TABLE "subjects" ADD COLUMN "is_popular" boolean DEFAULT false;
  ALTER TABLE "subjects" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "subjects" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "subject_categories" ADD COLUMN "description" varchar;
  ALTER TABLE "subject_categories" ADD COLUMN "icon" varchar;
  ALTER TABLE "subject_categories" ADD COLUMN "color" varchar;
  ALTER TABLE "payout_requests" ADD COLUMN "recipient_code" varchar;
  ALTER TABLE "payout_requests" ADD COLUMN "transfer_reference" varchar;
  ALTER TABLE "payout_requests" ADD COLUMN "transfer_code" varchar;
  ALTER TABLE "payout_requests" ADD COLUMN "transfer_status" "enum_payout_requests_transfer_status";
  ALTER TABLE "bookings" ADD COLUMN "awaiting_release_at" timestamp(3) with time zone;
  ALTER TABLE "live_sessions" ADD COLUMN "last_heartbeat_at" timestamp(3) with time zone;
  ALTER TABLE "live_session_participants" ADD COLUMN "sfu_session_id" varchar;
  ALTER TABLE "assessment_questions" ADD COLUMN "back_text" varchar;
  ALTER TABLE "assessment_results" ADD COLUMN "mastery" numeric DEFAULT 0;
  ALTER TABLE "subjects" ADD CONSTRAINT "subjects_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "tutor_profiles_is_verified_idx" ON "tutor_profiles" USING btree ("is_verified");
  CREATE INDEX "tutor_profiles_payout_recipient_code_idx" ON "tutor_profiles" USING btree ("payout_recipient_code");
  CREATE INDEX "subjects_image_idx" ON "subjects" USING btree ("image_id");
  CREATE INDEX "payout_requests_transfer_reference_idx" ON "payout_requests" USING btree ("transfer_reference");
  CREATE INDEX "bookings_awaiting_release_at_idx" ON "bookings" USING btree ("awaiting_release_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  ALTER TABLE "subjects" DROP CONSTRAINT "subjects_image_id_media_id_fk";
  
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_bookings_status";
  CREATE TYPE "public"."enum_bookings_status" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded');
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_bookings_status";
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE "public"."enum_bookings_status" USING "status"::"public"."enum_bookings_status";
  ALTER TABLE "assessment_questions" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "assessment_questions" ALTER COLUMN "type" SET DEFAULT 'single_choice'::text;
  DROP TYPE "public"."enum_assessment_questions_type";
  CREATE TYPE "public"."enum_assessment_questions_type" AS ENUM('single_choice', 'multiple_choice', 'true_false', 'short_answer', 'essay');
  ALTER TABLE "assessment_questions" ALTER COLUMN "type" SET DEFAULT 'single_choice'::"public"."enum_assessment_questions_type";
  ALTER TABLE "assessment_questions" ALTER COLUMN "type" SET DATA TYPE "public"."enum_assessment_questions_type" USING "type"::"public"."enum_assessment_questions_type";
  ALTER TABLE "activity_logs" ALTER COLUMN "type" SET DATA TYPE text;
  DROP TYPE "public"."enum_activity_logs_type";
  CREATE TYPE "public"."enum_activity_logs_type" AS ENUM('assessment_assigned', 'assessment_completed', 'class_joined', 'class_left', 'class_ended');
  ALTER TABLE "activity_logs" ALTER COLUMN "type" SET DATA TYPE "public"."enum_activity_logs_type" USING "type"::"public"."enum_activity_logs_type";
  DROP INDEX "tutor_profiles_is_verified_idx";
  DROP INDEX "tutor_profiles_payout_recipient_code_idx";
  DROP INDEX "subjects_image_idx";
  DROP INDEX "payout_requests_transfer_reference_idx";
  DROP INDEX "bookings_awaiting_release_at_idx";
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  ALTER TABLE "tutor_profiles" DROP COLUMN "is_verified";
  ALTER TABLE "tutor_profiles" DROP COLUMN "payout_bank_code";
  ALTER TABLE "tutor_profiles" DROP COLUMN "payout_bank_name";
  ALTER TABLE "tutor_profiles" DROP COLUMN "payout_account_number";
  ALTER TABLE "tutor_profiles" DROP COLUMN "payout_account_name";
  ALTER TABLE "tutor_profiles" DROP COLUMN "payout_recipient_code";
  ALTER TABLE "tutor_profiles" DROP COLUMN "rejection_reason";
  ALTER TABLE "subjects" DROP COLUMN "short_description";
  ALTER TABLE "subjects" DROP COLUMN "description";
  ALTER TABLE "subjects" DROP COLUMN "image_id";
  ALTER TABLE "subjects" DROP COLUMN "icon";
  ALTER TABLE "subjects" DROP COLUMN "color";
  ALTER TABLE "subjects" DROP COLUMN "sort_order";
  ALTER TABLE "subjects" DROP COLUMN "is_popular";
  ALTER TABLE "subjects" DROP COLUMN "seo_title";
  ALTER TABLE "subjects" DROP COLUMN "seo_description";
  ALTER TABLE "subject_categories" DROP COLUMN "description";
  ALTER TABLE "subject_categories" DROP COLUMN "icon";
  ALTER TABLE "subject_categories" DROP COLUMN "color";
  ALTER TABLE "payout_requests" DROP COLUMN "recipient_code";
  ALTER TABLE "payout_requests" DROP COLUMN "transfer_reference";
  ALTER TABLE "payout_requests" DROP COLUMN "transfer_code";
  ALTER TABLE "payout_requests" DROP COLUMN "transfer_status";
  ALTER TABLE "bookings" DROP COLUMN "awaiting_release_at";
  ALTER TABLE "live_sessions" DROP COLUMN "last_heartbeat_at";
  ALTER TABLE "live_session_participants" DROP COLUMN "sfu_session_id";
  ALTER TABLE "assessment_questions" DROP COLUMN "back_text";
  ALTER TABLE "assessment_results" DROP COLUMN "mastery";
  DROP TYPE "public"."enum_payout_requests_transfer_status";`)
}

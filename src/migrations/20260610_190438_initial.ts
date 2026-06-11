import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Guard: if the schema was already created via Payload's push mode (pre-migration era),
  // the types and tables already exist. Skip the CREATE statements rather than erroring.
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS exists
  `)
  if ((result.rows[0] as any)?.exists === true) {
    payload.logger.info('[migration] Schema already exists — marking initial migration as applied without re-running DDL.')
    return
  }

  await db.execute(sql`
   CREATE TYPE "public"."enum_users_account_type" AS ENUM('admin', 'tutor', 'parent', 'student');
  CREATE TYPE "public"."enum_users_grade_level" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  CREATE TYPE "public"."enum_media_purpose" AS ENUM('avatar', 'class_asset', 'assessment_question', 'identity_document', 'certification', 'class_material', 'general');
  CREATE TYPE "public"."enum_tutor_profiles_grades_taught" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  CREATE TYPE "public"."enum_tutor_profiles_type" AS ENUM('one-on-one', 'group');
  CREATE TYPE "public"."enum_tutor_profiles_background_check_status" AS ENUM('none', 'pending', 'cleared', 'failed', 'expired');
  CREATE TYPE "public"."enum_tutor_profiles_mode" AS ENUM('online', 'hybrid');
  CREATE TYPE "public"."enum_tutor_profiles_usage_plan" AS ENUM('existing', 'marketplace', 'both');
  CREATE TYPE "public"."enum_subjects_grade_levels" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  CREATE TYPE "public"."enum_subjects_category" AS ENUM('math', 'science', 'language_arts', 'social_studies', 'world_languages', 'computing', 'arts', 'pe_health', 'test_prep', 'other');
  CREATE TYPE "public"."enum_wallets_currency" AS ENUM('ngn', 'usd');
  CREATE TYPE "public"."enum_transactions_gateway" AS ENUM('wallet', 'paystack', 'manual');
  CREATE TYPE "public"."enum_transactions_type" AS ENUM('deposit', 'payment', 'refund', 'payout', 'credit_grant', 'adjustment');
  CREATE TYPE "public"."enum_transactions_currency" AS ENUM('ngn', 'usd');
  CREATE TYPE "public"."enum_transactions_status" AS ENUM('pending', 'success', 'failed', 'reversed');
  CREATE TYPE "public"."enum_bookings_days_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  CREATE TYPE "public"."enum_bookings_status" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded');
  CREATE TYPE "public"."enum_bookings_payment_status" AS ENUM('unpaid', 'held', 'paid', 'refunded', 'failed');
  CREATE TYPE "public"."enum_bookings_grade_level" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  CREATE TYPE "public"."enum_bookings_currency" AS ENUM('ngn', 'usd');
  CREATE TYPE "public"."enum_students_grade_level" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  CREATE TYPE "public"."enum_classes_schedule_day" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  CREATE TYPE "public"."enum_classes_class_type" AS ENUM('one-on-one', 'group');
  CREATE TYPE "public"."enum_classes_grade_level" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  CREATE TYPE "public"."enum_classes_status" AS ENUM('scheduled', 'active', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_class_invitations_invitee_type" AS ENUM('parent', 'student');
  CREATE TYPE "public"."enum_class_invitations_status" AS ENUM('pending', 'accepted', 'declined', 'expired', 'revoked');
  CREATE TYPE "public"."enum_live_sessions_status" AS ENUM('scheduled', 'waiting', 'live', 'ended', 'cancelled');
  CREATE TYPE "public"."enum_attendance_status" AS ENUM('present', 'late', 'left-early', 'absent');
  CREATE TYPE "public"."enum_attendance_engagement_flag" AS ENUM('unknown', 'good', 'partial', 'poor', 'absent');
  CREATE TYPE "public"."enum_live_session_participants_account_type" AS ENUM('tutor', 'student', 'parent');
  CREATE TYPE "public"."enum_assessments_type" AS ENUM('quiz', 'flashcard', 'practice_test', 'homework');
  CREATE TYPE "public"."enum_assessments_grade_level" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  CREATE TYPE "public"."enum_assessment_questions_type" AS ENUM('single_choice', 'multiple_choice', 'true_false', 'short_answer', 'essay');
  CREATE TYPE "public"."enum_tutor_assessments_status" AS ENUM('pending', 'in_progress', 'completed', 'expired');
  CREATE TYPE "public"."enum_notifications_type" AS ENUM('student_joined_class', 'parent_accepted_invite', 'student_added_to_class', 'assessment_completed', 'assessment_sent', 'new_booking', 'class_reminder', 'payment_received', 'general');
  CREATE TYPE "public"."enum_notifications_priority" AS ENUM('low', 'normal', 'high');
  CREATE TYPE "public"."enum_activity_logs_type" AS ENUM('assessment_assigned', 'assessment_completed', 'class_joined', 'class_left', 'class_ended');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"account_type" "enum_users_account_type" DEFAULT 'student' NOT NULL,
  	"phone_number" varchar,
  	"country" varchar,
  	"timezone" varchar,
  	"avatar_id" integer,
  	"date_of_birth" timestamp(3) with time zone,
  	"is_active" boolean DEFAULT true,
  	"parent_id" integer,
  	"is_managed_account" boolean DEFAULT false,
  	"parental_consent_given" boolean DEFAULT false,
  	"has_completed_onboarding" boolean DEFAULT false,
  	"grade_level" "enum_users_grade_level",
  	"learning_goals" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"subjects_id" integer
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"uploaded_by_id" integer,
  	"purpose" "enum_media_purpose" DEFAULT 'general',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar
  );
  
  CREATE TABLE "tutor_profiles_teaching_certifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"issuing_body" varchar,
  	"issue_date" timestamp(3) with time zone,
  	"expiry_date" timestamp(3) with time zone,
  	"document_id" integer
  );
  
  CREATE TABLE "tutor_profiles_grades_taught" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_tutor_profiles_grades_taught",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tutor_profiles_type" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_tutor_profiles_type",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tutor_profiles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"is_approved" boolean DEFAULT false,
  	"background_check_status" "enum_tutor_profiles_background_check_status" DEFAULT 'none',
  	"background_check_completed_at" timestamp(3) with time zone,
  	"identity_verified" boolean DEFAULT false,
  	"identity_document_id" integer,
  	"rating" numeric DEFAULT 0,
  	"total_reviews" numeric DEFAULT 0,
  	"onboarding_completed" boolean DEFAULT false,
  	"headline" varchar,
  	"bio" varchar,
  	"years_of_experience" numeric,
  	"mode" "enum_tutor_profiles_mode",
  	"usage_plan" "enum_tutor_profiles_usage_plan",
  	"hourly_rate" numeric,
  	"min_age" numeric,
  	"max_age" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tutor_profiles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"subjects_id" integer
  );
  
  CREATE TABLE "subjects_grade_levels" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_subjects_grade_levels",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "subjects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"category" "enum_subjects_category",
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"review" varchar NOT NULL,
  	"rating" numeric NOT NULL,
  	"user_id" integer NOT NULL,
  	"tutor_id" integer NOT NULL,
  	"class_id" integer,
  	"booking_id" integer,
  	"tutor_response" varchar,
  	"is_approved" boolean DEFAULT false,
  	"flagged" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wallets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"currency" "enum_wallets_currency" DEFAULT 'ngn' NOT NULL,
  	"balance" numeric DEFAULT 0 NOT NULL,
  	"locked_balance" numeric DEFAULT 0 NOT NULL,
  	"credit_balance" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "transactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar,
  	"gateway" "enum_transactions_gateway" DEFAULT 'wallet' NOT NULL,
  	"type" "enum_transactions_type" NOT NULL,
  	"sender_id" integer NOT NULL,
  	"receiver_id" integer NOT NULL,
  	"tutor_id" integer,
  	"related_booking_id" integer,
  	"related_live_session_id" integer,
  	"amount" numeric NOT NULL,
  	"currency" "enum_transactions_currency" DEFAULT 'ngn' NOT NULL,
  	"status" "enum_transactions_status" DEFAULT 'pending' NOT NULL,
  	"description" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bookings_days_of_week" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_bookings_days_of_week",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "bookings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tutor_id" integer NOT NULL,
  	"student_id" integer NOT NULL,
  	"parent_id" integer,
  	"status" "enum_bookings_status" DEFAULT 'pending' NOT NULL,
  	"payment_status" "enum_bookings_payment_status" DEFAULT 'unpaid' NOT NULL,
  	"transaction_id" integer,
  	"date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone NOT NULL,
  	"hours_per_day" numeric DEFAULT 1 NOT NULL,
  	"grade_level" "enum_bookings_grade_level",
  	"price" numeric NOT NULL,
  	"currency" "enum_bookings_currency" DEFAULT 'ngn' NOT NULL,
  	"message" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bookings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"subjects_id" integer
  );
  
  CREATE TABLE "students" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"generated_email" varchar NOT NULL,
  	"generated_password" varchar NOT NULL,
  	"grade_level" "enum_students_grade_level",
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "classes_schedule" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" "enum_classes_schedule_day" NOT NULL,
  	"start_time" varchar NOT NULL,
  	"end_time" varchar NOT NULL
  );
  
  CREATE TABLE "classes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tutor_id" integer NOT NULL,
  	"title" varchar,
  	"subject_id" integer NOT NULL,
  	"description" varchar,
  	"class_type" "enum_classes_class_type" DEFAULT 'one-on-one' NOT NULL,
  	"grade_level" "enum_classes_grade_level" DEFAULT '6' NOT NULL,
  	"timezone" varchar DEFAULT 'Africa/Lagos' NOT NULL,
  	"max_students" numeric DEFAULT 1,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone NOT NULL,
  	"status" "enum_classes_status" DEFAULT 'scheduled' NOT NULL,
  	"whiteboard_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "classes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "class_invitations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"class_id" integer NOT NULL,
  	"inviter_id" integer NOT NULL,
  	"invitee_email" varchar NOT NULL,
  	"invitee_type" "enum_class_invitations_invitee_type" NOT NULL,
  	"token" varchar NOT NULL,
  	"status" "enum_class_invitations_status" DEFAULT 'pending' NOT NULL,
  	"accepted_by_id" integer,
  	"expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "whiteboards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"owner_id" integer NOT NULL,
  	"class_id" integer,
  	"live_session_id" integer,
  	"share_token" varchar,
  	"is_public" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "whiteboard_slides" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"whiteboard_id" integer NOT NULL,
  	"order" numeric DEFAULT 0 NOT NULL,
  	"title" varchar,
  	"data" jsonb,
  	"thumbnail_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "live_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"class_id" integer NOT NULL,
  	"tutor_id" integer NOT NULL,
  	"room_id" varchar NOT NULL,
  	"scheduled_for" timestamp(3) with time zone,
  	"started_at" timestamp(3) with time zone,
  	"ended_at" timestamp(3) with time zone,
  	"status" "enum_live_sessions_status" DEFAULT 'scheduled' NOT NULL,
  	"show_whiteboard" boolean DEFAULT false,
  	"active_whiteboard_id" integer,
  	"coins_consumed" numeric DEFAULT 0,
  	"duration_minutes" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "live_sessions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "attendance" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"live_session_id" integer NOT NULL,
  	"class_id" integer NOT NULL,
  	"student_id" integer NOT NULL,
  	"parent_id" integer,
  	"tutor_id" integer,
  	"joined_at" timestamp(3) with time zone NOT NULL,
  	"left_at" timestamp(3) with time zone,
  	"duration_minutes" numeric DEFAULT 0,
  	"status" "enum_attendance_status" DEFAULT 'present' NOT NULL,
  	"lateness_minutes" numeric DEFAULT 0,
  	"engagement_flag" "enum_attendance_engagement_flag" DEFAULT 'unknown',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "live_session_participants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"live_session_id" integer NOT NULL,
  	"class_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"account_type" "enum_live_session_participants_account_type" NOT NULL,
  	"joined_at" timestamp(3) with time zone NOT NULL,
  	"left_at" timestamp(3) with time zone,
  	"duration_seconds" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assessments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"subject_id" integer NOT NULL,
  	"tutor_id" integer NOT NULL,
  	"type" "enum_assessments_type" DEFAULT 'quiz' NOT NULL,
  	"grade_level" "enum_assessments_grade_level",
  	"instructions" varchar,
  	"time_limit_minutes" numeric DEFAULT 0,
  	"max_questions" numeric DEFAULT 100,
  	"passing_score" numeric DEFAULT 70,
  	"is_published" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "assessment_questions_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"option_text" varchar NOT NULL,
  	"is_correct" boolean DEFAULT false
  );
  
  CREATE TABLE "assessment_questions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"assessment_id" integer NOT NULL,
  	"question_text" varchar NOT NULL,
  	"type" "enum_assessment_questions_type" DEFAULT 'single_choice' NOT NULL,
  	"image_id" integer,
  	"explanation" varchar,
  	"points" numeric DEFAULT 1 NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tutor_assessments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"assessment_id" integer NOT NULL,
  	"tutor_id" integer NOT NULL,
  	"student_id" integer NOT NULL,
  	"class_id" integer NOT NULL,
  	"status" "enum_tutor_assessments_status" DEFAULT 'pending' NOT NULL,
  	"due_date" timestamp(3) with time zone,
  	"max_attempts" numeric DEFAULT 1,
  	"attempt_count" numeric DEFAULT 0,
  	"instructions" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tutor_assessments_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"assessment_questions_id" integer
  );
  
  CREATE TABLE "assessment_results_answers_selected_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"option_index" numeric
  );
  
  CREATE TABLE "assessment_results_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question_id" integer NOT NULL,
  	"text_answer" varchar,
  	"is_correct" boolean DEFAULT false,
  	"points_earned" numeric DEFAULT 0
  );
  
  CREATE TABLE "assessment_results" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tutor_assessment_id" integer NOT NULL,
  	"student_id" integer NOT NULL,
  	"tutor_id" integer NOT NULL,
  	"total_points" numeric DEFAULT 0,
  	"earned_points" numeric DEFAULT 0,
  	"score" numeric DEFAULT 0,
  	"passed" boolean DEFAULT false,
  	"attempt" numeric DEFAULT 1,
  	"submitted_at" timestamp(3) with time zone,
  	"time_taken_seconds" numeric DEFAULT 0,
  	"feedback" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"recipient_id" integer NOT NULL,
  	"actor_id" integer,
  	"type" "enum_notifications_type" NOT NULL,
  	"title" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"is_read" boolean DEFAULT false,
  	"seen_at" timestamp(3) with time zone,
  	"priority" "enum_notifications_priority" DEFAULT 'normal',
  	"link" varchar,
  	"related_entity_collection" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "activity_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subject_id" integer NOT NULL,
  	"actor_id" integer,
  	"type" "enum_activity_logs_type" NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"link" varchar,
  	"related_collection" varchar,
  	"related_id" varchar,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"tutor_profiles_id" integer,
  	"subjects_id" integer,
  	"reviews_id" integer,
  	"wallets_id" integer,
  	"transactions_id" integer,
  	"bookings_id" integer,
  	"students_id" integer,
  	"classes_id" integer,
  	"class_invitations_id" integer,
  	"whiteboards_id" integer,
  	"whiteboard_slides_id" integer,
  	"live_sessions_id" integer,
  	"attendance_id" integer,
  	"live_session_participants_id" integer,
  	"assessments_id" integer,
  	"assessment_questions_id" integer,
  	"tutor_assessments_id" integer,
  	"assessment_results_id" integer,
  	"notifications_id" integer,
  	"activity_logs_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_subjects_fk" FOREIGN KEY ("subjects_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tutor_profiles_teaching_certifications" ADD CONSTRAINT "tutor_profiles_teaching_certifications_document_id_media_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tutor_profiles_teaching_certifications" ADD CONSTRAINT "tutor_profiles_teaching_certifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tutor_profiles_grades_taught" ADD CONSTRAINT "tutor_profiles_grades_taught_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tutor_profiles_type" ADD CONSTRAINT "tutor_profiles_type_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tutor_profiles" ADD CONSTRAINT "tutor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tutor_profiles" ADD CONSTRAINT "tutor_profiles_identity_document_id_media_id_fk" FOREIGN KEY ("identity_document_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tutor_profiles_rels" ADD CONSTRAINT "tutor_profiles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tutor_profiles_rels" ADD CONSTRAINT "tutor_profiles_rels_subjects_fk" FOREIGN KEY ("subjects_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subjects_grade_levels" ADD CONSTRAINT "subjects_grade_levels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tutor_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_related_booking_id_bookings_id_fk" FOREIGN KEY ("related_booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_related_live_session_id_live_sessions_id_fk" FOREIGN KEY ("related_live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings_days_of_week" ADD CONSTRAINT "bookings_days_of_week_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tutor_id_tutor_profiles_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings_rels" ADD CONSTRAINT "bookings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings_rels" ADD CONSTRAINT "bookings_rels_subjects_fk" FOREIGN KEY ("subjects_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "students" ADD CONSTRAINT "students_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "classes_schedule" ADD CONSTRAINT "classes_schedule_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "classes" ADD CONSTRAINT "classes_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "classes" ADD CONSTRAINT "classes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "classes" ADD CONSTRAINT "classes_whiteboard_id_whiteboards_id_fk" FOREIGN KEY ("whiteboard_id") REFERENCES "public"."whiteboards"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "classes_rels" ADD CONSTRAINT "classes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "classes_rels" ADD CONSTRAINT "classes_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_invitations" ADD CONSTRAINT "class_invitations_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "class_invitations" ADD CONSTRAINT "class_invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "class_invitations" ADD CONSTRAINT "class_invitations_accepted_by_id_users_id_fk" FOREIGN KEY ("accepted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_live_session_id_live_sessions_id_fk" FOREIGN KEY ("live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "whiteboard_slides" ADD CONSTRAINT "whiteboard_slides_whiteboard_id_whiteboards_id_fk" FOREIGN KEY ("whiteboard_id") REFERENCES "public"."whiteboards"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "whiteboard_slides" ADD CONSTRAINT "whiteboard_slides_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_active_whiteboard_id_whiteboards_id_fk" FOREIGN KEY ("active_whiteboard_id") REFERENCES "public"."whiteboards"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_sessions_rels" ADD CONSTRAINT "live_sessions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "live_sessions_rels" ADD CONSTRAINT "live_sessions_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_live_session_id_live_sessions_id_fk" FOREIGN KEY ("live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_live_session_id_live_sessions_id_fk" FOREIGN KEY ("live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assessments" ADD CONSTRAINT "assessments_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assessment_questions_options" ADD CONSTRAINT "assessment_questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tutor_assessments" ADD CONSTRAINT "tutor_assessments_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tutor_assessments" ADD CONSTRAINT "tutor_assessments_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tutor_assessments" ADD CONSTRAINT "tutor_assessments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tutor_assessments" ADD CONSTRAINT "tutor_assessments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tutor_assessments_rels" ADD CONSTRAINT "tutor_assessments_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tutor_assessments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tutor_assessments_rels" ADD CONSTRAINT "tutor_assessments_rels_assessment_questions_fk" FOREIGN KEY ("assessment_questions_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assessment_results_answers_selected_options" ADD CONSTRAINT "assessment_results_answers_selected_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."assessment_results_answers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assessment_results_answers" ADD CONSTRAINT "assessment_results_answers_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assessment_results_answers" ADD CONSTRAINT "assessment_results_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."assessment_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_tutor_assessment_id_tutor_assessments_id_fk" FOREIGN KEY ("tutor_assessment_id") REFERENCES "public"."tutor_assessments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tutor_profiles_fk" FOREIGN KEY ("tutor_profiles_id") REFERENCES "public"."tutor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subjects_fk" FOREIGN KEY ("subjects_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wallets_fk" FOREIGN KEY ("wallets_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transactions_fk" FOREIGN KEY ("transactions_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bookings_fk" FOREIGN KEY ("bookings_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_students_fk" FOREIGN KEY ("students_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_classes_fk" FOREIGN KEY ("classes_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_class_invitations_fk" FOREIGN KEY ("class_invitations_id") REFERENCES "public"."class_invitations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_whiteboards_fk" FOREIGN KEY ("whiteboards_id") REFERENCES "public"."whiteboards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_whiteboard_slides_fk" FOREIGN KEY ("whiteboard_slides_id") REFERENCES "public"."whiteboard_slides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_live_sessions_fk" FOREIGN KEY ("live_sessions_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attendance_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_live_session_participants_fk" FOREIGN KEY ("live_session_participants_id") REFERENCES "public"."live_session_participants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assessments_fk" FOREIGN KEY ("assessments_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assessment_questions_fk" FOREIGN KEY ("assessment_questions_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tutor_assessments_fk" FOREIGN KEY ("tutor_assessments_id") REFERENCES "public"."tutor_assessments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assessment_results_fk" FOREIGN KEY ("assessment_results_id") REFERENCES "public"."assessment_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk" FOREIGN KEY ("notifications_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_activity_logs_fk" FOREIGN KEY ("activity_logs_id") REFERENCES "public"."activity_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_avatar_idx" ON "users" USING btree ("avatar_id");
  CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");
  CREATE INDEX "users_parent_idx" ON "users" USING btree ("parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_subjects_id_idx" ON "users_rels" USING btree ("subjects_id");
  CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");
  CREATE INDEX "media_purpose_idx" ON "media" USING btree ("purpose");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "tutor_profiles_teaching_certifications_order_idx" ON "tutor_profiles_teaching_certifications" USING btree ("_order");
  CREATE INDEX "tutor_profiles_teaching_certifications_parent_id_idx" ON "tutor_profiles_teaching_certifications" USING btree ("_parent_id");
  CREATE INDEX "tutor_profiles_teaching_certifications_document_idx" ON "tutor_profiles_teaching_certifications" USING btree ("document_id");
  CREATE INDEX "tutor_profiles_grades_taught_order_idx" ON "tutor_profiles_grades_taught" USING btree ("order");
  CREATE INDEX "tutor_profiles_grades_taught_parent_idx" ON "tutor_profiles_grades_taught" USING btree ("parent_id");
  CREATE INDEX "tutor_profiles_type_order_idx" ON "tutor_profiles_type" USING btree ("order");
  CREATE INDEX "tutor_profiles_type_parent_idx" ON "tutor_profiles_type" USING btree ("parent_id");
  CREATE UNIQUE INDEX "tutor_profiles_slug_idx" ON "tutor_profiles" USING btree ("slug");
  CREATE UNIQUE INDEX "tutor_profiles_user_idx" ON "tutor_profiles" USING btree ("user_id");
  CREATE INDEX "tutor_profiles_is_approved_idx" ON "tutor_profiles" USING btree ("is_approved");
  CREATE INDEX "tutor_profiles_background_check_status_idx" ON "tutor_profiles" USING btree ("background_check_status");
  CREATE INDEX "tutor_profiles_identity_document_idx" ON "tutor_profiles" USING btree ("identity_document_id");
  CREATE INDEX "tutor_profiles_updated_at_idx" ON "tutor_profiles" USING btree ("updated_at");
  CREATE INDEX "tutor_profiles_created_at_idx" ON "tutor_profiles" USING btree ("created_at");
  CREATE INDEX "tutor_profiles_rels_order_idx" ON "tutor_profiles_rels" USING btree ("order");
  CREATE INDEX "tutor_profiles_rels_parent_idx" ON "tutor_profiles_rels" USING btree ("parent_id");
  CREATE INDEX "tutor_profiles_rels_path_idx" ON "tutor_profiles_rels" USING btree ("path");
  CREATE INDEX "tutor_profiles_rels_subjects_id_idx" ON "tutor_profiles_rels" USING btree ("subjects_id");
  CREATE INDEX "subjects_grade_levels_order_idx" ON "subjects_grade_levels" USING btree ("order");
  CREATE INDEX "subjects_grade_levels_parent_idx" ON "subjects_grade_levels" USING btree ("parent_id");
  CREATE UNIQUE INDEX "subjects_name_idx" ON "subjects" USING btree ("name");
  CREATE INDEX "subjects_category_idx" ON "subjects" USING btree ("category");
  CREATE UNIQUE INDEX "subjects_slug_idx" ON "subjects" USING btree ("slug");
  CREATE INDEX "subjects_updated_at_idx" ON "subjects" USING btree ("updated_at");
  CREATE INDEX "subjects_created_at_idx" ON "subjects" USING btree ("created_at");
  CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id");
  CREATE INDEX "reviews_tutor_idx" ON "reviews" USING btree ("tutor_id");
  CREATE INDEX "reviews_class_idx" ON "reviews" USING btree ("class_id");
  CREATE INDEX "reviews_booking_idx" ON "reviews" USING btree ("booking_id");
  CREATE INDEX "reviews_is_approved_idx" ON "reviews" USING btree ("is_approved");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "wallets_user_idx" ON "wallets" USING btree ("user_id");
  CREATE INDEX "wallets_updated_at_idx" ON "wallets" USING btree ("updated_at");
  CREATE INDEX "wallets_created_at_idx" ON "wallets" USING btree ("created_at");
  CREATE UNIQUE INDEX "transactions_reference_idx" ON "transactions" USING btree ("reference");
  CREATE INDEX "transactions_gateway_idx" ON "transactions" USING btree ("gateway");
  CREATE INDEX "transactions_type_idx" ON "transactions" USING btree ("type");
  CREATE INDEX "transactions_sender_idx" ON "transactions" USING btree ("sender_id");
  CREATE INDEX "transactions_receiver_idx" ON "transactions" USING btree ("receiver_id");
  CREATE INDEX "transactions_tutor_idx" ON "transactions" USING btree ("tutor_id");
  CREATE INDEX "transactions_related_booking_idx" ON "transactions" USING btree ("related_booking_id");
  CREATE INDEX "transactions_related_live_session_idx" ON "transactions" USING btree ("related_live_session_id");
  CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");
  CREATE INDEX "transactions_updated_at_idx" ON "transactions" USING btree ("updated_at");
  CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");
  CREATE INDEX "bookings_days_of_week_order_idx" ON "bookings_days_of_week" USING btree ("order");
  CREATE INDEX "bookings_days_of_week_parent_idx" ON "bookings_days_of_week" USING btree ("parent_id");
  CREATE INDEX "bookings_tutor_idx" ON "bookings" USING btree ("tutor_id");
  CREATE INDEX "bookings_student_idx" ON "bookings" USING btree ("student_id");
  CREATE INDEX "bookings_parent_idx" ON "bookings" USING btree ("parent_id");
  CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");
  CREATE INDEX "bookings_payment_status_idx" ON "bookings" USING btree ("payment_status");
  CREATE INDEX "bookings_transaction_idx" ON "bookings" USING btree ("transaction_id");
  CREATE INDEX "bookings_date_idx" ON "bookings" USING btree ("date");
  CREATE INDEX "bookings_updated_at_idx" ON "bookings" USING btree ("updated_at");
  CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");
  CREATE INDEX "bookings_rels_order_idx" ON "bookings_rels" USING btree ("order");
  CREATE INDEX "bookings_rels_parent_idx" ON "bookings_rels" USING btree ("parent_id");
  CREATE INDEX "bookings_rels_path_idx" ON "bookings_rels" USING btree ("path");
  CREATE INDEX "bookings_rels_subjects_id_idx" ON "bookings_rels" USING btree ("subjects_id");
  CREATE INDEX "students_user_idx" ON "students" USING btree ("user_id");
  CREATE INDEX "students_parent_idx" ON "students" USING btree ("parent_id");
  CREATE UNIQUE INDEX "students_generated_email_idx" ON "students" USING btree ("generated_email");
  CREATE INDEX "students_updated_at_idx" ON "students" USING btree ("updated_at");
  CREATE INDEX "students_created_at_idx" ON "students" USING btree ("created_at");
  CREATE INDEX "classes_schedule_order_idx" ON "classes_schedule" USING btree ("_order");
  CREATE INDEX "classes_schedule_parent_id_idx" ON "classes_schedule" USING btree ("_parent_id");
  CREATE INDEX "classes_tutor_idx" ON "classes" USING btree ("tutor_id");
  CREATE INDEX "classes_subject_idx" ON "classes" USING btree ("subject_id");
  CREATE INDEX "classes_grade_level_idx" ON "classes" USING btree ("grade_level");
  CREATE INDEX "classes_start_date_idx" ON "classes" USING btree ("start_date");
  CREATE INDEX "classes_status_idx" ON "classes" USING btree ("status");
  CREATE INDEX "classes_whiteboard_idx" ON "classes" USING btree ("whiteboard_id");
  CREATE INDEX "classes_updated_at_idx" ON "classes" USING btree ("updated_at");
  CREATE INDEX "classes_created_at_idx" ON "classes" USING btree ("created_at");
  CREATE INDEX "classes_rels_order_idx" ON "classes_rels" USING btree ("order");
  CREATE INDEX "classes_rels_parent_idx" ON "classes_rels" USING btree ("parent_id");
  CREATE INDEX "classes_rels_path_idx" ON "classes_rels" USING btree ("path");
  CREATE INDEX "classes_rels_users_id_idx" ON "classes_rels" USING btree ("users_id");
  CREATE INDEX "class_invitations_class_idx" ON "class_invitations" USING btree ("class_id");
  CREATE INDEX "class_invitations_inviter_idx" ON "class_invitations" USING btree ("inviter_id");
  CREATE INDEX "class_invitations_invitee_email_idx" ON "class_invitations" USING btree ("invitee_email");
  CREATE UNIQUE INDEX "class_invitations_token_idx" ON "class_invitations" USING btree ("token");
  CREATE INDEX "class_invitations_status_idx" ON "class_invitations" USING btree ("status");
  CREATE INDEX "class_invitations_accepted_by_idx" ON "class_invitations" USING btree ("accepted_by_id");
  CREATE INDEX "class_invitations_expires_at_idx" ON "class_invitations" USING btree ("expires_at");
  CREATE INDEX "class_invitations_updated_at_idx" ON "class_invitations" USING btree ("updated_at");
  CREATE INDEX "class_invitations_created_at_idx" ON "class_invitations" USING btree ("created_at");
  CREATE INDEX "whiteboards_owner_idx" ON "whiteboards" USING btree ("owner_id");
  CREATE INDEX "whiteboards_class_idx" ON "whiteboards" USING btree ("class_id");
  CREATE INDEX "whiteboards_live_session_idx" ON "whiteboards" USING btree ("live_session_id");
  CREATE UNIQUE INDEX "whiteboards_share_token_idx" ON "whiteboards" USING btree ("share_token");
  CREATE INDEX "whiteboards_updated_at_idx" ON "whiteboards" USING btree ("updated_at");
  CREATE INDEX "whiteboards_created_at_idx" ON "whiteboards" USING btree ("created_at");
  CREATE INDEX "whiteboard_slides_whiteboard_idx" ON "whiteboard_slides" USING btree ("whiteboard_id");
  CREATE INDEX "whiteboard_slides_order_idx" ON "whiteboard_slides" USING btree ("order");
  CREATE INDEX "whiteboard_slides_thumbnail_idx" ON "whiteboard_slides" USING btree ("thumbnail_id");
  CREATE INDEX "whiteboard_slides_updated_at_idx" ON "whiteboard_slides" USING btree ("updated_at");
  CREATE INDEX "whiteboard_slides_created_at_idx" ON "whiteboard_slides" USING btree ("created_at");
  CREATE INDEX "live_sessions_class_idx" ON "live_sessions" USING btree ("class_id");
  CREATE INDEX "live_sessions_tutor_idx" ON "live_sessions" USING btree ("tutor_id");
  CREATE UNIQUE INDEX "live_sessions_room_id_idx" ON "live_sessions" USING btree ("room_id");
  CREATE INDEX "live_sessions_scheduled_for_idx" ON "live_sessions" USING btree ("scheduled_for");
  CREATE INDEX "live_sessions_status_idx" ON "live_sessions" USING btree ("status");
  CREATE INDEX "live_sessions_active_whiteboard_idx" ON "live_sessions" USING btree ("active_whiteboard_id");
  CREATE INDEX "live_sessions_updated_at_idx" ON "live_sessions" USING btree ("updated_at");
  CREATE INDEX "live_sessions_created_at_idx" ON "live_sessions" USING btree ("created_at");
  CREATE INDEX "live_sessions_rels_order_idx" ON "live_sessions_rels" USING btree ("order");
  CREATE INDEX "live_sessions_rels_parent_idx" ON "live_sessions_rels" USING btree ("parent_id");
  CREATE INDEX "live_sessions_rels_path_idx" ON "live_sessions_rels" USING btree ("path");
  CREATE INDEX "live_sessions_rels_users_id_idx" ON "live_sessions_rels" USING btree ("users_id");
  CREATE INDEX "attendance_live_session_idx" ON "attendance" USING btree ("live_session_id");
  CREATE INDEX "attendance_class_idx" ON "attendance" USING btree ("class_id");
  CREATE INDEX "attendance_student_idx" ON "attendance" USING btree ("student_id");
  CREATE INDEX "attendance_parent_idx" ON "attendance" USING btree ("parent_id");
  CREATE INDEX "attendance_tutor_idx" ON "attendance" USING btree ("tutor_id");
  CREATE INDEX "attendance_joined_at_idx" ON "attendance" USING btree ("joined_at");
  CREATE INDEX "attendance_status_idx" ON "attendance" USING btree ("status");
  CREATE INDEX "attendance_engagement_flag_idx" ON "attendance" USING btree ("engagement_flag");
  CREATE INDEX "attendance_updated_at_idx" ON "attendance" USING btree ("updated_at");
  CREATE INDEX "attendance_created_at_idx" ON "attendance" USING btree ("created_at");
  CREATE INDEX "live_session_participants_live_session_idx" ON "live_session_participants" USING btree ("live_session_id");
  CREATE INDEX "live_session_participants_class_idx" ON "live_session_participants" USING btree ("class_id");
  CREATE INDEX "live_session_participants_user_idx" ON "live_session_participants" USING btree ("user_id");
  CREATE INDEX "live_session_participants_joined_at_idx" ON "live_session_participants" USING btree ("joined_at");
  CREATE INDEX "live_session_participants_updated_at_idx" ON "live_session_participants" USING btree ("updated_at");
  CREATE INDEX "live_session_participants_created_at_idx" ON "live_session_participants" USING btree ("created_at");
  CREATE INDEX "assessments_subject_idx" ON "assessments" USING btree ("subject_id");
  CREATE INDEX "assessments_tutor_idx" ON "assessments" USING btree ("tutor_id");
  CREATE INDEX "assessments_type_idx" ON "assessments" USING btree ("type");
  CREATE INDEX "assessments_grade_level_idx" ON "assessments" USING btree ("grade_level");
  CREATE INDEX "assessments_is_published_idx" ON "assessments" USING btree ("is_published");
  CREATE INDEX "assessments_updated_at_idx" ON "assessments" USING btree ("updated_at");
  CREATE INDEX "assessments_created_at_idx" ON "assessments" USING btree ("created_at");
  CREATE INDEX "assessment_questions_options_order_idx" ON "assessment_questions_options" USING btree ("_order");
  CREATE INDEX "assessment_questions_options_parent_id_idx" ON "assessment_questions_options" USING btree ("_parent_id");
  CREATE INDEX "assessment_questions_assessment_idx" ON "assessment_questions" USING btree ("assessment_id");
  CREATE INDEX "assessment_questions_type_idx" ON "assessment_questions" USING btree ("type");
  CREATE INDEX "assessment_questions_image_idx" ON "assessment_questions" USING btree ("image_id");
  CREATE INDEX "assessment_questions_order_idx" ON "assessment_questions" USING btree ("order");
  CREATE INDEX "assessment_questions_updated_at_idx" ON "assessment_questions" USING btree ("updated_at");
  CREATE INDEX "assessment_questions_created_at_idx" ON "assessment_questions" USING btree ("created_at");
  CREATE INDEX "tutor_assessments_assessment_idx" ON "tutor_assessments" USING btree ("assessment_id");
  CREATE INDEX "tutor_assessments_tutor_idx" ON "tutor_assessments" USING btree ("tutor_id");
  CREATE INDEX "tutor_assessments_student_idx" ON "tutor_assessments" USING btree ("student_id");
  CREATE INDEX "tutor_assessments_class_idx" ON "tutor_assessments" USING btree ("class_id");
  CREATE INDEX "tutor_assessments_status_idx" ON "tutor_assessments" USING btree ("status");
  CREATE INDEX "tutor_assessments_due_date_idx" ON "tutor_assessments" USING btree ("due_date");
  CREATE INDEX "tutor_assessments_updated_at_idx" ON "tutor_assessments" USING btree ("updated_at");
  CREATE INDEX "tutor_assessments_created_at_idx" ON "tutor_assessments" USING btree ("created_at");
  CREATE INDEX "tutor_assessments_rels_order_idx" ON "tutor_assessments_rels" USING btree ("order");
  CREATE INDEX "tutor_assessments_rels_parent_idx" ON "tutor_assessments_rels" USING btree ("parent_id");
  CREATE INDEX "tutor_assessments_rels_path_idx" ON "tutor_assessments_rels" USING btree ("path");
  CREATE INDEX "tutor_assessments_rels_assessment_questions_id_idx" ON "tutor_assessments_rels" USING btree ("assessment_questions_id");
  CREATE INDEX "assessment_results_answers_selected_options_order_idx" ON "assessment_results_answers_selected_options" USING btree ("_order");
  CREATE INDEX "assessment_results_answers_selected_options_parent_id_idx" ON "assessment_results_answers_selected_options" USING btree ("_parent_id");
  CREATE INDEX "assessment_results_answers_order_idx" ON "assessment_results_answers" USING btree ("_order");
  CREATE INDEX "assessment_results_answers_parent_id_idx" ON "assessment_results_answers" USING btree ("_parent_id");
  CREATE INDEX "assessment_results_answers_question_idx" ON "assessment_results_answers" USING btree ("question_id");
  CREATE INDEX "assessment_results_tutor_assessment_idx" ON "assessment_results" USING btree ("tutor_assessment_id");
  CREATE INDEX "assessment_results_student_idx" ON "assessment_results" USING btree ("student_id");
  CREATE INDEX "assessment_results_tutor_idx" ON "assessment_results" USING btree ("tutor_id");
  CREATE INDEX "assessment_results_attempt_idx" ON "assessment_results" USING btree ("attempt");
  CREATE INDEX "assessment_results_submitted_at_idx" ON "assessment_results" USING btree ("submitted_at");
  CREATE INDEX "assessment_results_updated_at_idx" ON "assessment_results" USING btree ("updated_at");
  CREATE INDEX "assessment_results_created_at_idx" ON "assessment_results" USING btree ("created_at");
  CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id");
  CREATE INDEX "notifications_actor_idx" ON "notifications" USING btree ("actor_id");
  CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");
  CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");
  CREATE INDEX "notifications_updated_at_idx" ON "notifications" USING btree ("updated_at");
  CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
  CREATE INDEX "activity_logs_subject_idx" ON "activity_logs" USING btree ("subject_id");
  CREATE INDEX "activity_logs_actor_idx" ON "activity_logs" USING btree ("actor_id");
  CREATE INDEX "activity_logs_type_idx" ON "activity_logs" USING btree ("type");
  CREATE INDEX "activity_logs_related_collection_idx" ON "activity_logs" USING btree ("related_collection");
  CREATE INDEX "activity_logs_related_id_idx" ON "activity_logs" USING btree ("related_id");
  CREATE INDEX "activity_logs_updated_at_idx" ON "activity_logs" USING btree ("updated_at");
  CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_tutor_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("tutor_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_subjects_id_idx" ON "payload_locked_documents_rels" USING btree ("subjects_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_wallets_id_idx" ON "payload_locked_documents_rels" USING btree ("wallets_id");
  CREATE INDEX "payload_locked_documents_rels_transactions_id_idx" ON "payload_locked_documents_rels" USING btree ("transactions_id");
  CREATE INDEX "payload_locked_documents_rels_bookings_id_idx" ON "payload_locked_documents_rels" USING btree ("bookings_id");
  CREATE INDEX "payload_locked_documents_rels_students_id_idx" ON "payload_locked_documents_rels" USING btree ("students_id");
  CREATE INDEX "payload_locked_documents_rels_classes_id_idx" ON "payload_locked_documents_rels" USING btree ("classes_id");
  CREATE INDEX "payload_locked_documents_rels_class_invitations_id_idx" ON "payload_locked_documents_rels" USING btree ("class_invitations_id");
  CREATE INDEX "payload_locked_documents_rels_whiteboards_id_idx" ON "payload_locked_documents_rels" USING btree ("whiteboards_id");
  CREATE INDEX "payload_locked_documents_rels_whiteboard_slides_id_idx" ON "payload_locked_documents_rels" USING btree ("whiteboard_slides_id");
  CREATE INDEX "payload_locked_documents_rels_live_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("live_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_attendance_id_idx" ON "payload_locked_documents_rels" USING btree ("attendance_id");
  CREATE INDEX "payload_locked_documents_rels_live_session_participants__idx" ON "payload_locked_documents_rels" USING btree ("live_session_participants_id");
  CREATE INDEX "payload_locked_documents_rels_assessments_id_idx" ON "payload_locked_documents_rels" USING btree ("assessments_id");
  CREATE INDEX "payload_locked_documents_rels_assessment_questions_id_idx" ON "payload_locked_documents_rels" USING btree ("assessment_questions_id");
  CREATE INDEX "payload_locked_documents_rels_tutor_assessments_id_idx" ON "payload_locked_documents_rels" USING btree ("tutor_assessments_id");
  CREATE INDEX "payload_locked_documents_rels_assessment_results_id_idx" ON "payload_locked_documents_rels" USING btree ("assessment_results_id");
  CREATE INDEX "payload_locked_documents_rels_notifications_id_idx" ON "payload_locked_documents_rels" USING btree ("notifications_id");
  CREATE INDEX "payload_locked_documents_rels_activity_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("activity_logs_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "tutor_profiles_teaching_certifications" CASCADE;
  DROP TABLE "tutor_profiles_grades_taught" CASCADE;
  DROP TABLE "tutor_profiles_type" CASCADE;
  DROP TABLE "tutor_profiles" CASCADE;
  DROP TABLE "tutor_profiles_rels" CASCADE;
  DROP TABLE "subjects_grade_levels" CASCADE;
  DROP TABLE "subjects" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "wallets" CASCADE;
  DROP TABLE "transactions" CASCADE;
  DROP TABLE "bookings_days_of_week" CASCADE;
  DROP TABLE "bookings" CASCADE;
  DROP TABLE "bookings_rels" CASCADE;
  DROP TABLE "students" CASCADE;
  DROP TABLE "classes_schedule" CASCADE;
  DROP TABLE "classes" CASCADE;
  DROP TABLE "classes_rels" CASCADE;
  DROP TABLE "class_invitations" CASCADE;
  DROP TABLE "whiteboards" CASCADE;
  DROP TABLE "whiteboard_slides" CASCADE;
  DROP TABLE "live_sessions" CASCADE;
  DROP TABLE "live_sessions_rels" CASCADE;
  DROP TABLE "attendance" CASCADE;
  DROP TABLE "live_session_participants" CASCADE;
  DROP TABLE "assessments" CASCADE;
  DROP TABLE "assessment_questions_options" CASCADE;
  DROP TABLE "assessment_questions" CASCADE;
  DROP TABLE "tutor_assessments" CASCADE;
  DROP TABLE "tutor_assessments_rels" CASCADE;
  DROP TABLE "assessment_results_answers_selected_options" CASCADE;
  DROP TABLE "assessment_results_answers" CASCADE;
  DROP TABLE "assessment_results" CASCADE;
  DROP TABLE "notifications" CASCADE;
  DROP TABLE "activity_logs" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_account_type";
  DROP TYPE "public"."enum_users_grade_level";
  DROP TYPE "public"."enum_media_purpose";
  DROP TYPE "public"."enum_tutor_profiles_grades_taught";
  DROP TYPE "public"."enum_tutor_profiles_type";
  DROP TYPE "public"."enum_tutor_profiles_background_check_status";
  DROP TYPE "public"."enum_tutor_profiles_mode";
  DROP TYPE "public"."enum_tutor_profiles_usage_plan";
  DROP TYPE "public"."enum_subjects_grade_levels";
  DROP TYPE "public"."enum_subjects_category";
  DROP TYPE "public"."enum_wallets_currency";
  DROP TYPE "public"."enum_transactions_gateway";
  DROP TYPE "public"."enum_transactions_type";
  DROP TYPE "public"."enum_transactions_currency";
  DROP TYPE "public"."enum_transactions_status";
  DROP TYPE "public"."enum_bookings_days_of_week";
  DROP TYPE "public"."enum_bookings_status";
  DROP TYPE "public"."enum_bookings_payment_status";
  DROP TYPE "public"."enum_bookings_grade_level";
  DROP TYPE "public"."enum_bookings_currency";
  DROP TYPE "public"."enum_students_grade_level";
  DROP TYPE "public"."enum_classes_schedule_day";
  DROP TYPE "public"."enum_classes_class_type";
  DROP TYPE "public"."enum_classes_grade_level";
  DROP TYPE "public"."enum_classes_status";
  DROP TYPE "public"."enum_class_invitations_invitee_type";
  DROP TYPE "public"."enum_class_invitations_status";
  DROP TYPE "public"."enum_live_sessions_status";
  DROP TYPE "public"."enum_attendance_status";
  DROP TYPE "public"."enum_attendance_engagement_flag";
  DROP TYPE "public"."enum_live_session_participants_account_type";
  DROP TYPE "public"."enum_assessments_type";
  DROP TYPE "public"."enum_assessments_grade_level";
  DROP TYPE "public"."enum_assessment_questions_type";
  DROP TYPE "public"."enum_tutor_assessments_status";
  DROP TYPE "public"."enum_notifications_type";
  DROP TYPE "public"."enum_notifications_priority";
  DROP TYPE "public"."enum_activity_logs_type";`)
}

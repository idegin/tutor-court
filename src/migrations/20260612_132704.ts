import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "subject_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  INSERT INTO "subject_categories" ("name", "slug") VALUES 
    ('Mathematics', 'mathematics'),
    ('Language Arts / English', 'language-arts-english'),
    ('Science', 'science'),
    ('Social Studies', 'social-studies'),
    ('World Languages', 'world-languages'),
    ('Computing', 'computing'),
    ('Arts', 'arts'),
    ('PE & Health', 'pe-health'),
    ('Test Prep', 'test-prep'),
    ('Other', 'other')
  ON CONFLICT DO NOTHING;
  
  -- Convert all grade level columns to text first
  ALTER TABLE "users" ALTER COLUMN "grade_level" SET DATA TYPE text;
  ALTER TABLE "tutor_profiles_grades_taught" ALTER COLUMN "value" SET DATA TYPE text;
  ALTER TABLE "subjects_grade_levels" ALTER COLUMN "value" SET DATA TYPE text;
  ALTER TABLE "bookings" ALTER COLUMN "grade_level" SET DATA TYPE text;
  ALTER TABLE "students" ALTER COLUMN "grade_level" SET DATA TYPE text;
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DATA TYPE text;
  ALTER TABLE "assessments" ALTER COLUMN "grade_level" SET DATA TYPE text;

  -- Map K-12 grade level values to Nigerian grade level values
  UPDATE "users" SET "grade_level" = CASE "grade_level"
    WHEN 'K' THEN 'nursery_1'
    WHEN '1' THEN 'primary_1'
    WHEN '2' THEN 'primary_2'
    WHEN '3' THEN 'primary_3'
    WHEN '4' THEN 'primary_4'
    WHEN '5' THEN 'primary_5'
    WHEN '6' THEN 'primary_6'
    WHEN '7' THEN 'jss_1'
    WHEN '8' THEN 'jss_2'
    WHEN '9' THEN 'jss_3'
    WHEN '10' THEN 'sss_1'
    WHEN '11' THEN 'sss_2'
    WHEN '12' THEN 'sss_3'
    ELSE "grade_level"
  END WHERE "grade_level" IS NOT NULL;

  UPDATE "tutor_profiles_grades_taught" SET "value" = CASE "value"
    WHEN 'K' THEN 'nursery_1'
    WHEN '1' THEN 'primary_1'
    WHEN '2' THEN 'primary_2'
    WHEN '3' THEN 'primary_3'
    WHEN '4' THEN 'primary_4'
    WHEN '5' THEN 'primary_5'
    WHEN '6' THEN 'primary_6'
    WHEN '7' THEN 'jss_1'
    WHEN '8' THEN 'jss_2'
    WHEN '9' THEN 'jss_3'
    WHEN '10' THEN 'sss_1'
    WHEN '11' THEN 'sss_2'
    WHEN '12' THEN 'sss_3'
    ELSE "value"
  END WHERE "value" IS NOT NULL;

  UPDATE "subjects_grade_levels" SET "value" = CASE "value"
    WHEN 'K' THEN 'nursery_1'
    WHEN '1' THEN 'primary_1'
    WHEN '2' THEN 'primary_2'
    WHEN '3' THEN 'primary_3'
    WHEN '4' THEN 'primary_4'
    WHEN '5' THEN 'primary_5'
    WHEN '6' THEN 'primary_6'
    WHEN '7' THEN 'jss_1'
    WHEN '8' THEN 'jss_2'
    WHEN '9' THEN 'jss_3'
    WHEN '10' THEN 'sss_1'
    WHEN '11' THEN 'sss_2'
    WHEN '12' THEN 'sss_3'
    ELSE "value"
  END WHERE "value" IS NOT NULL;

  UPDATE "bookings" SET "grade_level" = CASE "grade_level"
    WHEN 'K' THEN 'nursery_1'
    WHEN '1' THEN 'primary_1'
    WHEN '2' THEN 'primary_2'
    WHEN '3' THEN 'primary_3'
    WHEN '4' THEN 'primary_4'
    WHEN '5' THEN 'primary_5'
    WHEN '6' THEN 'primary_6'
    WHEN '7' THEN 'jss_1'
    WHEN '8' THEN 'jss_2'
    WHEN '9' THEN 'jss_3'
    WHEN '10' THEN 'sss_1'
    WHEN '11' THEN 'sss_2'
    WHEN '12' THEN 'sss_3'
    ELSE "grade_level"
  END WHERE "grade_level" IS NOT NULL;

  UPDATE "students" SET "grade_level" = CASE "grade_level"
    WHEN 'K' THEN 'nursery_1'
    WHEN '1' THEN 'primary_1'
    WHEN '2' THEN 'primary_2'
    WHEN '3' THEN 'primary_3'
    WHEN '4' THEN 'primary_4'
    WHEN '5' THEN 'primary_5'
    WHEN '6' THEN 'primary_6'
    WHEN '7' THEN 'jss_1'
    WHEN '8' THEN 'jss_2'
    WHEN '9' THEN 'jss_3'
    WHEN '10' THEN 'sss_1'
    WHEN '11' THEN 'sss_2'
    WHEN '12' THEN 'sss_3'
    ELSE "grade_level"
  END WHERE "grade_level" IS NOT NULL;

  UPDATE "classes" SET "grade_level" = CASE "grade_level"
    WHEN 'K' THEN 'nursery_1'
    WHEN '1' THEN 'primary_1'
    WHEN '2' THEN 'primary_2'
    WHEN '3' THEN 'primary_3'
    WHEN '4' THEN 'primary_4'
    WHEN '5' THEN 'primary_5'
    WHEN '6' THEN 'primary_6'
    WHEN '7' THEN 'jss_1'
    WHEN '8' THEN 'jss_2'
    WHEN '9' THEN 'jss_3'
    WHEN '10' THEN 'sss_1'
    WHEN '11' THEN 'sss_2'
    WHEN '12' THEN 'sss_3'
    ELSE "grade_level"
  END WHERE "grade_level" IS NOT NULL;

  UPDATE "assessments" SET "grade_level" = CASE "grade_level"
    WHEN 'K' THEN 'nursery_1'
    WHEN '1' THEN 'primary_1'
    WHEN '2' THEN 'primary_2'
    WHEN '3' THEN 'primary_3'
    WHEN '4' THEN 'primary_4'
    WHEN '5' THEN 'primary_5'
    WHEN '6' THEN 'primary_6'
    WHEN '7' THEN 'jss_1'
    WHEN '8' THEN 'jss_2'
    WHEN '9' THEN 'jss_3'
    WHEN '10' THEN 'sss_1'
    WHEN '11' THEN 'sss_2'
    WHEN '12' THEN 'sss_3'
    ELSE "grade_level"
  END WHERE "grade_level" IS NOT NULL;

  -- Drop old enum types with CASCADE
  DROP TYPE "public"."enum_users_grade_level" CASCADE;
  DROP TYPE "public"."enum_tutor_profiles_grades_taught" CASCADE;
  DROP TYPE "public"."enum_subjects_grade_levels" CASCADE;
  DROP TYPE "public"."enum_bookings_grade_level" CASCADE;
  DROP TYPE "public"."enum_students_grade_level" CASCADE;
  DROP TYPE "public"."enum_classes_grade_level" CASCADE;
  DROP TYPE "public"."enum_assessments_grade_level" CASCADE;

  -- Create and apply new enum types
  CREATE TYPE "public"."enum_users_grade_level" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "users" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_users_grade_level" USING "grade_level"::"public"."enum_users_grade_level";

  CREATE TYPE "public"."enum_tutor_profiles_grades_taught" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "tutor_profiles_grades_taught" ALTER COLUMN "value" SET DATA TYPE "public"."enum_tutor_profiles_grades_taught" USING "value"::"public"."enum_tutor_profiles_grades_taught";

  CREATE TYPE "public"."enum_subjects_grade_levels" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "subjects_grade_levels" ALTER COLUMN "value" SET DATA TYPE "public"."enum_subjects_grade_levels" USING "value"::"public"."enum_subjects_grade_levels";

  CREATE TYPE "public"."enum_bookings_grade_level" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "bookings" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_bookings_grade_level" USING "grade_level"::"public"."enum_bookings_grade_level";

  CREATE TYPE "public"."enum_students_grade_level" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "students" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_students_grade_level" USING "grade_level"::"public"."enum_students_grade_level";

  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DEFAULT 'primary_1'::text;
  CREATE TYPE "public"."enum_classes_grade_level" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DEFAULT 'primary_1'::"public"."enum_classes_grade_level";
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_classes_grade_level" USING "grade_level"::"public"."enum_classes_grade_level";

  CREATE TYPE "public"."enum_assessments_grade_level" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "assessments" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_assessments_grade_level" USING "grade_level"::"public"."enum_assessments_grade_level";

  DROP INDEX "subjects_category_idx";
  ALTER TABLE "subjects" ADD COLUMN "category_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "subject_categories_id" integer;
  CREATE UNIQUE INDEX "subject_categories_name_idx" ON "subject_categories" USING btree ("name");
  CREATE UNIQUE INDEX "subject_categories_slug_idx" ON "subject_categories" USING btree ("slug");
  CREATE INDEX "subject_categories_updated_at_idx" ON "subject_categories" USING btree ("updated_at");
  CREATE INDEX "subject_categories_created_at_idx" ON "subject_categories" USING btree ("created_at");

  UPDATE "subjects" SET "category_id" = (SELECT id FROM "subject_categories" WHERE "slug" = 'mathematics') WHERE "category" = 'math';
  UPDATE "subjects" SET "category_id" = (SELECT id FROM "subject_categories" WHERE "slug" = 'language-arts-english') WHERE "category" = 'language_arts';
  UPDATE "subjects" SET "category_id" = (SELECT id FROM "subject_categories" WHERE "slug" = 'science') WHERE "category" = 'science';
  UPDATE "subjects" SET "category_id" = (SELECT id FROM "subject_categories" WHERE "slug" = 'social-studies') WHERE "category" = 'social_studies';
  UPDATE "subjects" SET "category_id" = (SELECT id FROM "subject_categories" WHERE "slug" = 'world-languages') WHERE "category" = 'world_languages';
  UPDATE "subjects" SET "category_id" = (SELECT id FROM "subject_categories" WHERE "slug" = 'computing') WHERE "category" = 'computing';
  UPDATE "subjects" SET "category_id" = (SELECT id FROM "subject_categories" WHERE "slug" = 'arts') WHERE "category" = 'arts';
  UPDATE "subjects" SET "category_id" = (SELECT id FROM "subject_categories" WHERE "slug" = 'pe-health') WHERE "category" = 'pe_health';
  UPDATE "subjects" SET "category_id" = (SELECT id FROM "subject_categories" WHERE "slug" = 'test-prep') WHERE "category" = 'test_prep';
  UPDATE "subjects" SET "category_id" = (SELECT id FROM "subject_categories" WHERE "slug" = 'other') WHERE "category" = 'other';
  UPDATE "subjects" SET "category_id" = (SELECT id FROM "subject_categories" WHERE "slug" = 'other') WHERE "category_id" IS NULL;

  ALTER TABLE "subjects" ALTER COLUMN "category_id" SET NOT NULL;

  ALTER TABLE "subjects" ADD CONSTRAINT "subjects_category_id_subject_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."subject_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subject_categories_fk" FOREIGN KEY ("subject_categories_id") REFERENCES "public"."subject_categories"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_subject_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("subject_categories_id");
  CREATE INDEX "subjects_category_idx" ON "subjects" USING btree ("category_id");
  ALTER TABLE "subjects" DROP COLUMN "category";
  DROP TYPE "public"."enum_subjects_category";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_subjects_category" AS ENUM('math', 'science', 'language_arts', 'social_studies', 'world_languages', 'computing', 'arts', 'pe_health', 'test_prep', 'other');
  ALTER TABLE "subject_categories" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "subject_categories" CASCADE;
  ALTER TABLE "subjects" DROP CONSTRAINT "subjects_category_id_subject_categories_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_subject_categories_fk";
  
  ALTER TABLE "users" ALTER COLUMN "grade_level" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_grade_level";
  CREATE TYPE "public"."enum_users_grade_level" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  ALTER TABLE "users" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_users_grade_level" USING "grade_level"::"public"."enum_users_grade_level";
  ALTER TABLE "tutor_profiles_grades_taught" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_tutor_profiles_grades_taught";
  CREATE TYPE "public"."enum_tutor_profiles_grades_taught" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  ALTER TABLE "tutor_profiles_grades_taught" ALTER COLUMN "value" SET DATA TYPE "public"."enum_tutor_profiles_grades_taught" USING "value"::"public"."enum_tutor_profiles_grades_taught";
  ALTER TABLE "subjects_grade_levels" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_subjects_grade_levels";
  CREATE TYPE "public"."enum_subjects_grade_levels" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  ALTER TABLE "subjects_grade_levels" ALTER COLUMN "value" SET DATA TYPE "public"."enum_subjects_grade_levels" USING "value"::"public"."enum_subjects_grade_levels";
  ALTER TABLE "bookings" ALTER COLUMN "grade_level" SET DATA TYPE text;
  DROP TYPE "public"."enum_bookings_grade_level";
  CREATE TYPE "public"."enum_bookings_grade_level" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  ALTER TABLE "bookings" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_bookings_grade_level" USING "grade_level"::"public"."enum_bookings_grade_level";
  ALTER TABLE "students" ALTER COLUMN "grade_level" SET DATA TYPE text;
  DROP TYPE "public"."enum_students_grade_level";
  CREATE TYPE "public"."enum_students_grade_level" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  ALTER TABLE "students" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_students_grade_level" USING "grade_level"::"public"."enum_students_grade_level";
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DATA TYPE text;
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DEFAULT '6'::text;
  DROP TYPE "public"."enum_classes_grade_level";
  CREATE TYPE "public"."enum_classes_grade_level" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DEFAULT '6'::"public"."enum_classes_grade_level";
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_classes_grade_level" USING "grade_level"::"public"."enum_classes_grade_level";
  ALTER TABLE "assessments" ALTER COLUMN "grade_level" SET DATA TYPE text;
  DROP TYPE "public"."enum_assessments_grade_level";
  CREATE TYPE "public"."enum_assessments_grade_level" AS ENUM('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
  ALTER TABLE "assessments" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_assessments_grade_level" USING "grade_level"::"public"."enum_assessments_grade_level";
  DROP INDEX "payload_locked_documents_rels_subject_categories_id_idx";
  DROP INDEX "subjects_category_idx";
  ALTER TABLE "subjects" ADD COLUMN "category" "enum_subjects_category";
  CREATE INDEX "subjects_category_idx" ON "subjects" USING btree ("category");
  ALTER TABLE "subjects" DROP COLUMN "category_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "subject_categories_id";`)
}

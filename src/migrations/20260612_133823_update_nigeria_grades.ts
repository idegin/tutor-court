import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- Convert all grade level columns to text first
  ALTER TABLE "users" ALTER COLUMN "grade_level" SET DATA TYPE text;
  ALTER TABLE "tutor_profiles_grades_taught" ALTER COLUMN "value" SET DATA TYPE text;
  ALTER TABLE "subjects_grade_levels" ALTER COLUMN "value" SET DATA TYPE text;
  ALTER TABLE "bookings" ALTER COLUMN "grade_level" SET DATA TYPE text;
  ALTER TABLE "students" ALTER COLUMN "grade_level" SET DATA TYPE text;
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DATA TYPE text;
  ALTER TABLE "assessments" ALTER COLUMN "grade_level" SET DATA TYPE text;

  -- Map detailed Nigerian grade levels to simplified grade levels
  UPDATE "users" SET "grade_level" = CASE "grade_level"
    WHEN 'nursery_1' THEN 'early_years'
    WHEN 'nursery_2' THEN 'early_years'
    WHEN 'nursery_3' THEN 'early_years'
    WHEN 'primary_1' THEN 'lower_primary'
    WHEN 'primary_2' THEN 'lower_primary'
    WHEN 'primary_3' THEN 'lower_primary'
    WHEN 'primary_4' THEN 'upper_primary'
    WHEN 'primary_5' THEN 'upper_primary'
    WHEN 'primary_6' THEN 'upper_primary'
    WHEN 'jss_1' THEN 'junior_high_school'
    WHEN 'jss_2' THEN 'junior_high_school'
    WHEN 'jss_3' THEN 'junior_high_school'
    WHEN 'sss_1' THEN 'senior_high_school'
    WHEN 'sss_2' THEN 'senior_high_school'
    WHEN 'sss_3' THEN 'senior_high_school'
    ELSE "grade_level"
  END WHERE "grade_level" IS NOT NULL;

  UPDATE "tutor_profiles_grades_taught" SET "value" = CASE "value"
    WHEN 'nursery_1' THEN 'early_years'
    WHEN 'nursery_2' THEN 'early_years'
    WHEN 'nursery_3' THEN 'early_years'
    WHEN 'primary_1' THEN 'lower_primary'
    WHEN 'primary_2' THEN 'lower_primary'
    WHEN 'primary_3' THEN 'lower_primary'
    WHEN 'primary_4' THEN 'upper_primary'
    WHEN 'primary_5' THEN 'upper_primary'
    WHEN 'primary_6' THEN 'upper_primary'
    WHEN 'jss_1' THEN 'junior_high_school'
    WHEN 'jss_2' THEN 'junior_high_school'
    WHEN 'jss_3' THEN 'junior_high_school'
    WHEN 'sss_1' THEN 'senior_high_school'
    WHEN 'sss_2' THEN 'senior_high_school'
    WHEN 'sss_3' THEN 'senior_high_school'
    ELSE "value"
  END WHERE "value" IS NOT NULL;

  UPDATE "subjects_grade_levels" SET "value" = CASE "value"
    WHEN 'nursery_1' THEN 'early_years'
    WHEN 'nursery_2' THEN 'early_years'
    WHEN 'nursery_3' THEN 'early_years'
    WHEN 'primary_1' THEN 'lower_primary'
    WHEN 'primary_2' THEN 'lower_primary'
    WHEN 'primary_3' THEN 'lower_primary'
    WHEN 'primary_4' THEN 'upper_primary'
    WHEN 'primary_5' THEN 'upper_primary'
    WHEN 'primary_6' THEN 'upper_primary'
    WHEN 'jss_1' THEN 'junior_high_school'
    WHEN 'jss_2' THEN 'junior_high_school'
    WHEN 'jss_3' THEN 'junior_high_school'
    WHEN 'sss_1' THEN 'senior_high_school'
    WHEN 'sss_2' THEN 'senior_high_school'
    WHEN 'sss_3' THEN 'senior_high_school'
    ELSE "value"
  END WHERE "value" IS NOT NULL;

  UPDATE "bookings" SET "grade_level" = CASE "grade_level"
    WHEN 'nursery_1' THEN 'early_years'
    WHEN 'nursery_2' THEN 'early_years'
    WHEN 'nursery_3' THEN 'early_years'
    WHEN 'primary_1' THEN 'lower_primary'
    WHEN 'primary_2' THEN 'lower_primary'
    WHEN 'primary_3' THEN 'lower_primary'
    WHEN 'primary_4' THEN 'upper_primary'
    WHEN 'primary_5' THEN 'upper_primary'
    WHEN 'primary_6' THEN 'upper_primary'
    WHEN 'jss_1' THEN 'junior_high_school'
    WHEN 'jss_2' THEN 'junior_high_school'
    WHEN 'jss_3' THEN 'junior_high_school'
    WHEN 'sss_1' THEN 'senior_high_school'
    WHEN 'sss_2' THEN 'senior_high_school'
    WHEN 'sss_3' THEN 'senior_high_school'
    ELSE "grade_level"
  END WHERE "grade_level" IS NOT NULL;

  UPDATE "students" SET "grade_level" = CASE "grade_level"
    WHEN 'nursery_1' THEN 'early_years'
    WHEN 'nursery_2' THEN 'early_years'
    WHEN 'nursery_3' THEN 'early_years'
    WHEN 'primary_1' THEN 'lower_primary'
    WHEN 'primary_2' THEN 'lower_primary'
    WHEN 'primary_3' THEN 'lower_primary'
    WHEN 'primary_4' THEN 'upper_primary'
    WHEN 'primary_5' THEN 'upper_primary'
    WHEN 'primary_6' THEN 'upper_primary'
    WHEN 'jss_1' THEN 'junior_high_school'
    WHEN 'jss_2' THEN 'junior_high_school'
    WHEN 'jss_3' THEN 'junior_high_school'
    WHEN 'sss_1' THEN 'senior_high_school'
    WHEN 'sss_2' THEN 'senior_high_school'
    WHEN 'sss_3' THEN 'senior_high_school'
    ELSE "grade_level"
  END WHERE "grade_level" IS NOT NULL;

  UPDATE "classes" SET "grade_level" = CASE "grade_level"
    WHEN 'nursery_1' THEN 'early_years'
    WHEN 'nursery_2' THEN 'early_years'
    WHEN 'nursery_3' THEN 'early_years'
    WHEN 'primary_1' THEN 'lower_primary'
    WHEN 'primary_2' THEN 'lower_primary'
    WHEN 'primary_3' THEN 'lower_primary'
    WHEN 'primary_4' THEN 'upper_primary'
    WHEN 'primary_5' THEN 'upper_primary'
    WHEN 'primary_6' THEN 'upper_primary'
    WHEN 'jss_1' THEN 'junior_high_school'
    WHEN 'jss_2' THEN 'junior_high_school'
    WHEN 'jss_3' THEN 'junior_high_school'
    WHEN 'sss_1' THEN 'senior_high_school'
    WHEN 'sss_2' THEN 'senior_high_school'
    WHEN 'sss_3' THEN 'senior_high_school'
    ELSE "grade_level"
  END WHERE "grade_level" IS NOT NULL;

  UPDATE "assessments" SET "grade_level" = CASE "grade_level"
    WHEN 'nursery_1' THEN 'early_years'
    WHEN 'nursery_2' THEN 'early_years'
    WHEN 'nursery_3' THEN 'early_years'
    WHEN 'primary_1' THEN 'lower_primary'
    WHEN 'primary_2' THEN 'lower_primary'
    WHEN 'primary_3' THEN 'lower_primary'
    WHEN 'primary_4' THEN 'upper_primary'
    WHEN 'primary_5' THEN 'upper_primary'
    WHEN 'primary_6' THEN 'upper_primary'
    WHEN 'jss_1' THEN 'junior_high_school'
    WHEN 'jss_2' THEN 'junior_high_school'
    WHEN 'jss_3' THEN 'junior_high_school'
    WHEN 'sss_1' THEN 'senior_high_school'
    WHEN 'sss_2' THEN 'senior_high_school'
    WHEN 'sss_3' THEN 'senior_high_school'
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
  CREATE TYPE "public"."enum_users_grade_level" AS ENUM('early_years', 'lower_primary', 'upper_primary', 'junior_high_school', 'senior_high_school');
  ALTER TABLE "users" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_users_grade_level" USING "grade_level"::"public"."enum_users_grade_level";

  CREATE TYPE "public"."enum_tutor_profiles_grades_taught" AS ENUM('early_years', 'lower_primary', 'upper_primary', 'junior_high_school', 'senior_high_school');
  ALTER TABLE "tutor_profiles_grades_taught" ALTER COLUMN "value" SET DATA TYPE "public"."enum_tutor_profiles_grades_taught" USING "value"::"public"."enum_tutor_profiles_grades_taught";

  CREATE TYPE "public"."enum_subjects_grade_levels" AS ENUM('early_years', 'lower_primary', 'upper_primary', 'junior_high_school', 'senior_high_school');
  ALTER TABLE "subjects_grade_levels" ALTER COLUMN "value" SET DATA TYPE "public"."enum_subjects_grade_levels" USING "value"::"public"."enum_subjects_grade_levels";

  CREATE TYPE "public"."enum_bookings_grade_level" AS ENUM('early_years', 'lower_primary', 'upper_primary', 'junior_high_school', 'senior_high_school');
  ALTER TABLE "bookings" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_bookings_grade_level" USING "grade_level"::"public"."enum_bookings_grade_level";

  CREATE TYPE "public"."enum_students_grade_level" AS ENUM('early_years', 'lower_primary', 'upper_primary', 'junior_high_school', 'senior_high_school');
  ALTER TABLE "students" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_students_grade_level" USING "grade_level"::"public"."enum_students_grade_level";

  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DEFAULT 'lower_primary'::text;
  CREATE TYPE "public"."enum_classes_grade_level" AS ENUM('early_years', 'lower_primary', 'upper_primary', 'junior_high_school', 'senior_high_school');
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DEFAULT 'lower_primary'::"public"."enum_classes_grade_level";
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_classes_grade_level" USING "grade_level"::"public"."enum_classes_grade_level";

  CREATE TYPE "public"."enum_assessments_grade_level" AS ENUM('early_years', 'lower_primary', 'upper_primary', 'junior_high_school', 'senior_high_school');
  ALTER TABLE "assessments" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_assessments_grade_level" USING "grade_level"::"public"."enum_assessments_grade_level";
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "users" ALTER COLUMN "grade_level" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_grade_level" CASCADE;
  CREATE TYPE "public"."enum_users_grade_level" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "users" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_users_grade_level" USING "grade_level"::"public"."enum_users_grade_level";

  ALTER TABLE "tutor_profiles_grades_taught" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_tutor_profiles_grades_taught" CASCADE;
  CREATE TYPE "public"."enum_tutor_profiles_grades_taught" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "tutor_profiles_grades_taught" ALTER COLUMN "value" SET DATA TYPE "public"."enum_tutor_profiles_grades_taught" USING "value"::"public"."enum_tutor_profiles_grades_taught";

  ALTER TABLE "subjects_grade_levels" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_subjects_grade_levels" CASCADE;
  CREATE TYPE "public"."enum_subjects_grade_levels" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "subjects_grade_levels" ALTER COLUMN "value" SET DATA TYPE "public"."enum_subjects_grade_levels" USING "value"::"public"."enum_subjects_grade_levels";

  ALTER TABLE "bookings" ALTER COLUMN "grade_level" SET DATA TYPE text;
  DROP TYPE "public"."enum_bookings_grade_level" CASCADE;
  CREATE TYPE "public"."enum_bookings_grade_level" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "bookings" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_bookings_grade_level" USING "grade_level"::"public"."enum_bookings_grade_level";

  ALTER TABLE "students" ALTER COLUMN "grade_level" SET DATA TYPE text;
  DROP TYPE "public"."enum_students_grade_level" CASCADE;
  CREATE TYPE "public"."enum_students_grade_level" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "students" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_students_grade_level" USING "grade_level"::"public"."enum_students_grade_level";

  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DATA TYPE text;
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DEFAULT 'primary_1'::text;
  DROP TYPE "public"."enum_classes_grade_level" CASCADE;
  CREATE TYPE "public"."enum_classes_grade_level" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DEFAULT 'primary_1'::"public"."enum_classes_grade_level";
  ALTER TABLE "classes" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_classes_grade_level" USING "grade_level"::"public"."enum_classes_grade_level";

  ALTER TABLE "assessments" ALTER COLUMN "grade_level" SET DATA TYPE text;
  DROP TYPE "public"."enum_assessments_grade_level" CASCADE;
  CREATE TYPE "public"."enum_assessments_grade_level" AS ENUM('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'sss_1', 'sss_2', 'sss_3');
  ALTER TABLE "assessments" ALTER COLUMN "grade_level" SET DATA TYPE "public"."enum_assessments_grade_level" USING "grade_level"::"public"."enum_assessments_grade_level";
  `)
}

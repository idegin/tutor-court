import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add back_text to assessment_questions for flashcard back-of-card content
  await db.execute(sql`
    ALTER TABLE "assessment_questions"
      ADD COLUMN IF NOT EXISTS "back_text" text;
  `)

  // Add flashcard value to the question type enum
  await db.execute(sql`
    ALTER TYPE "public"."enum_assessment_questions_type"
      ADD VALUE IF NOT EXISTS 'flashcard';
  `)

  // Add mastery column to assessment_results (0-100 percentage for flashcard sessions)
  await db.execute(sql`
    ALTER TABLE "assessment_results"
      ADD COLUMN IF NOT EXISTS "mastery" numeric DEFAULT 0;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // PostgreSQL does not support removing enum values; only drop the columns
  await db.execute(sql`
    ALTER TABLE "assessment_questions" DROP COLUMN IF EXISTS "back_text";
  `)
  await db.execute(sql`
    ALTER TABLE "assessment_results" DROP COLUMN IF EXISTS "mastery";
  `)
}

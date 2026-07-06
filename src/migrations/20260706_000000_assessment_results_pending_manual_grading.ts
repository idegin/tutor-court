import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add `pending_manual_grading` to assessment_results. When true, the result
 * contains short-answer/essay answers that still require the tutor to grade
 * them manually (see api/assessments/results/submit and .../grade).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "assessment_results"
    ADD COLUMN IF NOT EXISTS "pending_manual_grading" boolean DEFAULT false;
  CREATE INDEX IF NOT EXISTS "assessment_results_pending_manual_grading_idx"
    ON "assessment_results" USING btree ("pending_manual_grading");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "assessment_results_pending_manual_grading_idx";
  ALTER TABLE "assessment_results" DROP COLUMN IF EXISTS "pending_manual_grading";
  `)
}

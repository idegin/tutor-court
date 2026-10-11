import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Change assessment_results_answers.text_answer from varchar to text.
 * Short-answer and essay responses can exceed varchar's typical limit.
 * In PostgreSQL, varchar without a length limit and text are stored
 * identically, so this is a metadata-only change with no data rewrite.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "assessment_results_answers"
      ALTER COLUMN "text_answer" TYPE text;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "assessment_results_answers"
      ALTER COLUMN "text_answer" TYPE varchar;
  `)
}

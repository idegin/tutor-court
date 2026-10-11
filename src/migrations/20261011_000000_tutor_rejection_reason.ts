import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "rejection_reason" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "rejection_reason";
  `)
}

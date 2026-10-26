import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false;
    CREATE INDEX IF NOT EXISTS "tutor_profiles_is_verified_idx" ON "tutor_profiles" USING btree ("is_verified");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "tutor_profiles_is_verified_idx";
    ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "is_verified";
  `)
}

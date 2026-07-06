import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * At most one class per booking — a partial unique index so a race (two holds
 * with different references) can't materialize two classes for one booking.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS "classes_booking_unique_idx"
    ON "classes" ("booking_id") WHERE "booking_id" IS NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "classes_booking_unique_idx";
  `)
}

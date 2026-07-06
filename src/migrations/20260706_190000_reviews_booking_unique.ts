import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * At most one review per booking — a partial unique index so a race (two
 * concurrent POSTs to /api/private/reviews) can't create two reviews for the
 * same completed booking. Mirrors the app-level one-per-booking dup check.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS "reviews_booking_unique_idx"
    ON "reviews" ("booking_id") WHERE "booking_id" IS NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "reviews_booking_unique_idx";
  `)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Escrow flow change: the tutor no longer self-releases on "complete". Instead
 * they mark work delivered → booking goes to `awaiting_release`, and the booker
 * (or the grace-window cron) releases the escrow. Adds:
 *   - enum value `awaiting_release` to `enum_bookings_status`
 *   - `bookings.awaiting_release_at` timestamp (drives the auto-release grace).
 *
 * The enum change uses the project's rebuild pattern (drop default → cast to
 * text → drop/recreate type → cast back → restore default) rather than
 * `ALTER TYPE ... ADD VALUE`, which is unreliable inside Payload's migration
 * transaction. (Hand-written & guarded.)
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Rebuild enum_bookings_status with the new 'awaiting_release' value.
    ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE text;
    DROP TYPE "public"."enum_bookings_status" CASCADE;
    CREATE TYPE "public"."enum_bookings_status" AS ENUM('pending', 'confirmed', 'in_progress', 'awaiting_release', 'completed', 'cancelled', 'refunded');
    ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE "public"."enum_bookings_status" USING "status"::"public"."enum_bookings_status";
    ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_bookings_status";

    -- Timestamp for when the tutor marked work delivered (grace-window anchor).
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "awaiting_release_at" timestamp(3) with time zone;
    CREATE INDEX IF NOT EXISTS "bookings_awaiting_release_at_idx" ON "bookings" USING btree ("awaiting_release_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Move any in-flight 'awaiting_release' rows back to a pre-feature state.
    UPDATE "bookings" SET "status" = 'confirmed' WHERE "status" = 'awaiting_release';

    ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE text;
    DROP TYPE "public"."enum_bookings_status" CASCADE;
    CREATE TYPE "public"."enum_bookings_status" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded');
    ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE "public"."enum_bookings_status" USING "status"::"public"."enum_bookings_status";
    ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_bookings_status";

    DROP INDEX IF EXISTS "bookings_awaiting_release_at_idx";
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "awaiting_release_at";
  `)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Links a marketplace booking to the class it materializes into:
 *   classes.booking_id  -> bookings.id
 *   bookings.class_id   -> classes.id
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "booking_id" integer;
  DO $$ BEGIN
    ALTER TABLE "classes" ADD CONSTRAINT "classes_booking_id_bookings_id_fk"
      FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  CREATE INDEX IF NOT EXISTS "classes_booking_idx" ON "classes" USING btree ("booking_id");

  ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "class_id" integer;
  DO $$ BEGIN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_class_id_classes_id_fk"
      FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  CREATE INDEX IF NOT EXISTS "bookings_class_idx" ON "bookings" USING btree ("class_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "classes_booking_idx";
  ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "classes_booking_id_bookings_id_fk";
  ALTER TABLE "classes" DROP COLUMN IF EXISTS "booking_id";
  DROP INDEX IF EXISTS "bookings_class_idx";
  ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_class_id_classes_id_fk";
  ALTER TABLE "bookings" DROP COLUMN IF EXISTS "class_id";
  `)
}

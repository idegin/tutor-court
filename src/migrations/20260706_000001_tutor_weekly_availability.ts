import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds the `weeklyAvailability` array field to tutor-profiles — a recurring
 * weekly set of day + start/end time slots shown on the public tutor profile.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "enum_tutor_profiles_weekly_availability_day" AS ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE TABLE IF NOT EXISTS "tutor_profiles_weekly_availability" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "day" "enum_tutor_profiles_weekly_availability_day" NOT NULL,
    "start_time" varchar NOT NULL,
    "end_time" varchar NOT NULL
  );

  CREATE INDEX IF NOT EXISTS "tutor_profiles_weekly_availability_order_idx" ON "tutor_profiles_weekly_availability" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "tutor_profiles_weekly_availability_parent_id_idx" ON "tutor_profiles_weekly_availability" USING btree ("_parent_id");

  DO $$ BEGIN
    ALTER TABLE "tutor_profiles_weekly_availability"
      ADD CONSTRAINT "tutor_profiles_weekly_availability_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "tutor_profiles"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "tutor_profiles_weekly_availability";
  DROP TYPE IF EXISTS "enum_tutor_profiles_weekly_availability_day";
  `)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Enforce at most one `live` session per class at the database level, so two
 * concurrent "start" requests can never create two live sessions (double room,
 * double billing). See api/live-sessions/start/route.ts, which now relies on
 * this insert failing to reuse the winning session.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- Close any pre-existing duplicate live sessions (keep the most recent per
  -- class) so the unique index below can be created.
  UPDATE "live_sessions"
  SET "status" = 'ended', "ended_at" = COALESCE("ended_at", now())
  WHERE "status" = 'live'
    AND "id" NOT IN (
      SELECT DISTINCT ON ("class_id") "id"
      FROM "live_sessions"
      WHERE "status" = 'live'
      ORDER BY "class_id", "created_at" DESC
    );

  CREATE UNIQUE INDEX IF NOT EXISTS "live_sessions_one_live_per_class_idx"
    ON "live_sessions" ("class_id")
    WHERE "status" = 'live';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "live_sessions_one_live_per_class_idx";
  `)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add `whiteboard_writable` to live_sessions. When set, the tutor has granted
 * enrolled students permission to draw on the shared whiteboard (see
 * api/whiteboards/[id]/slides/[slideId] write authorization and the classroom
 * tutor settings panel).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "live_sessions"
    ADD COLUMN IF NOT EXISTS "whiteboard_writable" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "live_sessions" DROP COLUMN IF EXISTS "whiteboard_writable";
  `)
}

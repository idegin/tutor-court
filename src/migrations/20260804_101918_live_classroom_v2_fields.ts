import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Live Classroom v2 data-model additions (Phase 1). Trimmed to ONLY the v2
// changes — the generator re-emitted already-applied `disputes` DDL due to
// migration-snapshot drift, which is removed here to avoid "already exists".

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "public"."enum_live_session_participants_role" AS ENUM('host', 'publisher', 'viewer');
  CREATE TABLE "live_session_messages_reactions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"emoji" varchar NOT NULL,
  	"user_id" integer NOT NULL
  );

  ALTER TABLE "whiteboards" ADD COLUMN "snapshot" jsonb;
  ALTER TABLE "live_sessions" ADD COLUMN "sfu_session_id" varchar;
  ALTER TABLE "live_sessions" ADD COLUMN "last_heartbeat_at" timestamp(3) with time zone;
  ALTER TABLE "live_session_participants" ADD COLUMN "role" "enum_live_session_participants_role" DEFAULT 'viewer';
  ALTER TABLE "live_session_participants" ADD COLUMN "hand_raised_at" timestamp(3) with time zone;
  ALTER TABLE "live_session_participants" ADD COLUMN "removed" boolean DEFAULT false;
  ALTER TABLE "live_session_participants" ADD COLUMN "removed_reason" varchar;
  ALTER TABLE "live_session_participants" ADD COLUMN "sfu_session_id" varchar;
  ALTER TABLE "live_session_messages" ADD COLUMN "reply_to_id" integer;
  ALTER TABLE "live_session_messages_reactions" ADD CONSTRAINT "live_session_messages_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_session_messages_reactions" ADD CONSTRAINT "live_session_messages_reactions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."live_session_messages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "live_session_messages_reactions_order_idx" ON "live_session_messages_reactions" USING btree ("_order");
  CREATE INDEX "live_session_messages_reactions_parent_id_idx" ON "live_session_messages_reactions" USING btree ("_parent_id");
  CREATE INDEX "live_session_messages_reactions_user_idx" ON "live_session_messages_reactions" USING btree ("user_id");
  ALTER TABLE "live_session_messages" ADD CONSTRAINT "live_session_messages_reply_to_id_live_session_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."live_session_messages"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "live_session_participants_role_idx" ON "live_session_participants" USING btree ("role");
  CREATE INDEX "live_session_messages_reply_to_idx" ON "live_session_messages" USING btree ("reply_to_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "live_session_messages_reactions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "live_session_messages_reactions" CASCADE;
  ALTER TABLE "live_session_messages" DROP CONSTRAINT "live_session_messages_reply_to_id_live_session_messages_id_fk";
  DROP INDEX "live_session_participants_role_idx";
  DROP INDEX "live_session_messages_reply_to_idx";
  ALTER TABLE "whiteboards" DROP COLUMN "snapshot";
  ALTER TABLE "live_sessions" DROP COLUMN "sfu_session_id";
  ALTER TABLE "live_sessions" DROP COLUMN "last_heartbeat_at";
  ALTER TABLE "live_session_participants" DROP COLUMN "role";
  ALTER TABLE "live_session_participants" DROP COLUMN "hand_raised_at";
  ALTER TABLE "live_session_participants" DROP COLUMN "removed";
  ALTER TABLE "live_session_participants" DROP COLUMN "removed_reason";
  ALTER TABLE "live_session_participants" DROP COLUMN "sfu_session_id";
  ALTER TABLE "live_session_messages" DROP COLUMN "reply_to_id";
  DROP TYPE "public"."enum_live_session_participants_role";`)
}

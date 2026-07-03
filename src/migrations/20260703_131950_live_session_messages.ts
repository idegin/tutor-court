import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_live_session_messages_sender_account_type" AS ENUM('tutor', 'student', 'parent', 'admin');
  CREATE TABLE "live_session_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"live_session_id" integer NOT NULL,
  	"sender_id" integer NOT NULL,
  	"sender_name" varchar NOT NULL,
  	"sender_account_type" "enum_live_session_messages_sender_account_type",
  	"message" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "live_session_messages_id" integer;
  ALTER TABLE "live_session_messages" ADD CONSTRAINT "live_session_messages_live_session_id_live_sessions_id_fk" FOREIGN KEY ("live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_session_messages" ADD CONSTRAINT "live_session_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "live_session_messages_live_session_idx" ON "live_session_messages" USING btree ("live_session_id");
  CREATE INDEX "live_session_messages_sender_idx" ON "live_session_messages" USING btree ("sender_id");
  CREATE INDEX "live_session_messages_updated_at_idx" ON "live_session_messages" USING btree ("updated_at");
  CREATE INDEX "live_session_messages_created_at_idx" ON "live_session_messages" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_live_session_messages_fk" FOREIGN KEY ("live_session_messages_id") REFERENCES "public"."live_session_messages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_live_session_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("live_session_messages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "live_session_messages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "live_session_messages" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_live_session_messages_fk";
  
  DROP INDEX "payload_locked_documents_rels_live_session_messages_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "live_session_messages_id";
  DROP TYPE "public"."enum_live_session_messages_sender_account_type";`)
}

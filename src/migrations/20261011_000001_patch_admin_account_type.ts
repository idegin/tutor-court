import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "users"
    SET "account_type" = 'admin'
    WHERE "email" = 'admin@tutorcourt.com'
      AND "account_type" != 'admin';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "users"
    SET "account_type" = 'student'
    WHERE "email" = 'admin@tutorcourt.com'
      AND "account_type" = 'admin';
  `)
}

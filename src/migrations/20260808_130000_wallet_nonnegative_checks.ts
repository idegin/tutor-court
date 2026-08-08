import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Defense-in-depth: DB CHECK constraints so a wallet balance can never go
 * negative, even if a future writer bypasses the guarded atomic helpers in
 * escrow.ts. The helpers already clamp with LEAST/GREATEST, so existing rows
 * satisfy these. (Hand-written & guarded.)
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "wallets" ADD CONSTRAINT "wallets_balance_nonneg" CHECK ("balance" >= 0);
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      ALTER TABLE "wallets" ADD CONSTRAINT "wallets_locked_nonneg" CHECK ("locked_balance" >= 0);
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      ALTER TABLE "wallets" ADD CONSTRAINT "wallets_credit_nonneg" CHECK ("credit_balance" >= 0);
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallets_balance_nonneg";
    ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallets_locked_nonneg";
    ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallets_credit_nonneg";
  `)
}

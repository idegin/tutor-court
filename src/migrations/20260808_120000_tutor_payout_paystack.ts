import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Tutor payouts via Paystack Transfers (NGN):
 *   - tutor_profiles: saved + verified bank details and the Paystack transfer
 *     recipient code.
 *   - payout_requests: recipient snapshot + transfer reference/status so the
 *     transfer webhook can finalize (or reverse) a disbursement.
 * (Hand-written & guarded.)
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "payout_bank_code" varchar;
    ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "payout_bank_name" varchar;
    ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "payout_account_number" varchar;
    ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "payout_account_name" varchar;
    ALTER TABLE "tutor_profiles" ADD COLUMN IF NOT EXISTS "payout_recipient_code" varchar;
    CREATE INDEX IF NOT EXISTS "tutor_profiles_payout_recipient_code_idx" ON "tutor_profiles" USING btree ("payout_recipient_code");
  `)

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_payout_requests_transfer_status" AS ENUM('none', 'processing', 'success', 'failed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    ALTER TABLE "payout_requests" ADD COLUMN IF NOT EXISTS "recipient_code" varchar;
    ALTER TABLE "payout_requests" ADD COLUMN IF NOT EXISTS "transfer_reference" varchar;
    ALTER TABLE "payout_requests" ADD COLUMN IF NOT EXISTS "transfer_status" "public"."enum_payout_requests_transfer_status";
    CREATE INDEX IF NOT EXISTS "payout_requests_transfer_reference_idx" ON "payout_requests" USING btree ("transfer_reference");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payout_requests_transfer_reference_idx";
    ALTER TABLE "payout_requests" DROP COLUMN IF EXISTS "transfer_status";
    ALTER TABLE "payout_requests" DROP COLUMN IF EXISTS "transfer_reference";
    ALTER TABLE "payout_requests" DROP COLUMN IF EXISTS "recipient_code";
    DROP TYPE IF EXISTS "public"."enum_payout_requests_transfer_status";

    DROP INDEX IF EXISTS "tutor_profiles_payout_recipient_code_idx";
    ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "payout_recipient_code";
    ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "payout_account_name";
    ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "payout_account_number";
    ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "payout_bank_name";
    ALTER TABLE "tutor_profiles" DROP COLUMN IF EXISTS "payout_bank_code";
  `)
}

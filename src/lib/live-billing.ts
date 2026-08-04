import { sql } from '@payloadcms/db-postgres'
import { CREDIT_RATE } from '@/lib/constants'

// Hard ceiling on a single OPEN log's countable interval. Until server-side
// presence/heartbeat lands (Phase 4/6), a participant who drops without a
// /leave beacon leaves an open log that would otherwise accrue billable minutes
// forever. Capping the open interval bounds the worst case to one session's
// worth rather than unbounded (a real class never approaches this).
const MAX_OPEN_LOG_SECONDS = 6 * 60 * 60

/**
 * Live-class billing math, shared by the status poll (incremental charging),
 * the manual /end route, and the out-of-credits auto-close.
 *
 * Billing model: the tutor's wallet is charged INCREMENTALLY as the class runs
 * (the status poll charges the delta since the previous poll), so the credit
 * balance visibly draws down live AND a class is still billed even if the tutor
 * closes the tab without clicking "End Class" (charged up to the last poll).
 * `live-sessions.coinsConsumed` is the running total already charged; /end and
 * auto-close only settle the final remaining delta rather than re-charging.
 */

// Sum the billable (student/parent) participant minutes for a session from its
// participant logs. Open logs count time up to `nowMs`; closed logs carry their
// full accumulated `durationSeconds` (which spans rejoins). If nobody billable
// ever joined, fall back to the tutor's own session duration as a baseline.
export function computeBillableMinutes(
  participantLogs: any[],
  session: any,
  nowMs: number,
): number {
  const startedTime = new Date(session.startedAt || session.createdAt).getTime()
  const sessionDurationMinutes = Math.max(1, Math.ceil((nowMs - startedTime) / (1000 * 60)))

  let totalParticipantMinutes = 0
  for (const log of participantLogs) {
    let logSeconds: number
    if (log.leftAt) {
      logSeconds =
        Number(log.durationSeconds) ||
        Math.max(0, (new Date(log.leftAt).getTime() - new Date(log.joinedAt).getTime()) / 1000)
    } else {
      const openInterval = Math.max(0, (nowMs - new Date(log.joinedAt).getTime()) / 1000)
      logSeconds = (Number(log.durationSeconds) || 0) + Math.min(openInterval, MAX_OPEN_LOG_SECONDS)
    }
    // No per-interval 1-minute floor beyond a single minimum: intervals
    // accumulate across rejoins in durationSeconds.
    totalParticipantMinutes += Math.max(1, Math.ceil(logSeconds / 60))
  }

  return totalParticipantMinutes > 0 ? totalParticipantMinutes : sessionDurationMinutes
}

export interface ChargeResult {
  /** Credits actually deducted from the wallet in THIS call. */
  charged: number
  /** Wallet balance after this call. */
  newBalance: number
  /** Running total of credits charged for the whole session. */
  consumed: number
  /** True when the class is escrow-funded (marketplace) → NOT billed via credits. */
  skipped?: boolean
}

/**
 * Charge the wallet the delta between `costSoFar` and what the session has
 * already been billed (`coinsConsumed`). Atomically claims the increment by
 * advancing `coinsConsumed` with a where-guard on its previous value, so two
 * overlapping status polls (or a poll racing /end) can never double-charge the
 * same minutes. Deducts nothing beyond the current balance.
 */
export async function chargeSessionDelta(
  payload: any,
  session: any,
  costSoFar: number,
  wallet: any,
): Promise<ChargeResult> {
  const prevConsumed = Number(session.coinsConsumed) || 0
  const currentBalance = Math.max(0, Number(wallet.creditBalance) || 0)

  // Marketplace (booking-backed) classes are paid up-front via escrow, so they
  // are NOT billed per-minute against the tutor's live-class credits.
  const classId = typeof session.class === 'object' ? session.class?.id : session.class
  if (classId) {
    const cls = await payload
      .findByID({ collection: 'classes', id: classId, depth: 1 })
      .catch(() => null)
    if (!cls) {
      // Fail SAFE on a transient class-read failure: skip this poll's charge
      // (and the zero-credit auto-end). `coinsConsumed` is not advanced, so the
      // minutes are simply charged on the next successful poll — no loss for a
      // SaaS class, no wrongful bill/auto-end for a booking-backed one.
      return { charged: 0, newBalance: currentBalance, consumed: prevConsumed, skipped: true }
    }
    const booking = (cls as any).booking
    // Escrow-funded only while the booking is actually held (a refunded booking's
    // class is cancelled, but guard anyway).
    const isEscrowFunded =
      booking && (typeof booking === 'object' ? booking.paymentStatus === 'held' : true)
    if (isEscrowFunded) {
      return { charged: 0, newBalance: currentBalance, consumed: prevConsumed, skipped: true }
    }
  }

  const cost = Math.floor(costSoFar)
  if (cost - prevConsumed <= 0) {
    return { charged: 0, newBalance: currentBalance, consumed: prevConsumed }
  }

  // ONE atomic statement: derive `charge` from the LIVE rows (never the caller's
  // possibly-stale snapshot), claim the per-session increment (guard on the live
  // coins_consumed so two overlapping polls can't both charge), and RELATIVELY
  // debit the wallet (GREATEST(0,…) → never negative; two concurrent charges on
  // one wallet each subtract their own amount). Claim + debit commit together, so
  // there is no crash-gap that could charge coins without deducting credits.
  const res: any = await payload.db.drizzle.execute(sql`
    WITH d AS (
      SELECT LEAST(GREATEST(0, ${cost} - ls."coins_consumed"), w."credit_balance") AS charge
      FROM "live_sessions" ls JOIN "wallets" w ON w."id" = ${wallet.id}
      WHERE ls."id" = ${session.id} AND ls."coins_consumed" IS NOT DISTINCT FROM ${prevConsumed}
    ),
    us AS (
      UPDATE "live_sessions" SET "coins_consumed" = "coins_consumed" + (SELECT charge FROM d)
      WHERE "id" = ${session.id} AND "coins_consumed" IS NOT DISTINCT FROM ${prevConsumed} AND EXISTS (SELECT 1 FROM d)
      RETURNING "coins_consumed"
    ),
    uw AS (
      UPDATE "wallets" SET "credit_balance" = GREATEST(0, "credit_balance" - (SELECT charge FROM d))
      WHERE "id" = ${wallet.id} AND EXISTS (SELECT 1 FROM us)
      RETURNING "credit_balance"
    )
    SELECT (SELECT charge FROM d) AS charge,
           (SELECT "coins_consumed" FROM us) AS consumed,
           (SELECT "credit_balance" FROM uw) AS balance
  `)
  const row = res?.rows?.[0]
  // `consumed` is null when THIS call lost the per-session claim race (us updated
  // nothing) — treat as a no-op so we never report/settle a debit we didn't make.
  if (!row || row.charge == null || row.consumed == null) {
    return { charged: 0, newBalance: currentBalance, consumed: prevConsumed }
  }
  const charged = Number(row.charge) || 0
  const newBalance = Math.max(0, Number(row.balance) || 0)
  const consumed = row.consumed != null ? Number(row.consumed) : prevConsumed + charged
  return { charged, newBalance, consumed }
}

export const NAIRA_PER_COIN = CREDIT_RATE.nairaPerCoin

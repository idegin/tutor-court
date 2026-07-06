import { CREDIT_RATE } from '@/lib/constants'

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
      logSeconds =
        (Number(log.durationSeconds) || 0) +
        Math.max(0, (nowMs - new Date(log.joinedAt).getTime()) / 1000)
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

  const delta = Math.max(0, Math.floor(costSoFar) - prevConsumed)

  if (delta <= 0 || currentBalance <= 0) {
    return { charged: 0, newBalance: currentBalance, consumed: prevConsumed }
  }

  const charge = Math.min(delta, currentBalance)

  // Claim the increment: only the racer that still sees `prevConsumed` wins and
  // advances the running total. Payload's where-update is find-then-update (not
  // a DB-conditional write), but for the single tutor browser polling this is
  // enough to stop a slow poll overlapping the next one from charging twice.
  const claim = await payload.update({
    collection: 'live-sessions',
    where: {
      and: [{ id: { equals: session.id } }, { coinsConsumed: { equals: prevConsumed } }],
    },
    data: { coinsConsumed: prevConsumed + charge } as any,
  })
  if (!claim.docs || claim.docs.length === 0) {
    return { charged: 0, newBalance: currentBalance, consumed: prevConsumed }
  }

  const newBalance = Math.max(0, currentBalance - charge)
  await payload.update({
    collection: 'wallets',
    id: wallet.id,
    data: { creditBalance: newBalance } as any,
  })

  return { charged: charge, newBalance, consumed: prevConsumed + charge }
}

export const NAIRA_PER_COIN = CREDIT_RATE.nairaPerCoin

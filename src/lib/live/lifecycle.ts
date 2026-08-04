import { CREDIT_RATE } from '@/lib/constants'
import { computeBillableMinutes, chargeSessionDelta } from '@/lib/live-billing'
import { forceCloseParticipantTracks } from '@/lib/live/cf-realtime'
import { revokeAblyTokens } from '@/lib/live/ably-server'

// Shared live-session billing + teardown, used by the tutor heartbeat
// (incremental charge + auto-end on zero credits) and the sweep cron
// (settle + close abandoned sessions). Keeps money/teardown logic in one place.

const idOf = (v: any): string => String(v && typeof v === 'object' ? v.id : v)

/**
 * Charge the tutor's wallet for the minutes elapsed since the last charge.
 * Returns the fresh balance + whether the wallet is now empty. Booking-backed
 * (escrow) classes are skipped inside chargeSessionDelta.
 */
export async function settleBilling(
  payload: any,
  session: any,
  nowMs: number,
): Promise<{ balance: number; consumed: number; empty: boolean; skipped: boolean }> {
  const wallets = await payload
    .find({ collection: 'wallets', where: { user: { equals: idOf(session.tutor) } }, limit: 1, depth: 0 })
    .catch(() => null)
  const wallet = wallets?.docs?.[0]
  if (!wallet) return { balance: 0, consumed: Number(session.coinsConsumed) || 0, empty: false, skipped: true }

  const logs = await payload.find({
    collection: 'live-session-participants',
    where: { liveSession: { equals: session.id } },
    limit: 1000,
    depth: 0,
  })
  const billableMinutes = computeBillableMinutes(logs.docs as any[], session, nowMs)
  const costSoFar = billableMinutes * CREDIT_RATE.coinsPerMinute
  const res = await chargeSessionDelta(payload, session, costSoFar, wallet)
  return { balance: res.newBalance, consumed: res.consumed, empty: !res.skipped && res.newBalance <= 0, skipped: Boolean(res.skipped) }
}

/**
 * End a live session authoritatively: final billing settle, close open
 * participant logs, tear down SFU tracks, revoke Ably tokens, mark ended.
 * Idempotent-ish (no-ops on an already-ended session).
 */
export async function endLiveSession(
  payload: any,
  session: any,
  reason: 'out_of_credits' | 'abandoned' | 'ended_by_tutor' = 'abandoned',
): Promise<void> {
  if (session.status === 'ended' || session.status === 'cancelled') return
  const now = new Date()
  const nowMs = now.getTime()
  const nowIso = now.toISOString()

  // Final settle BEFORE closing logs (open logs still count up to now).
  await settleBilling(payload, session, nowMs).catch(() => {})

  const logs = await payload.find({
    collection: 'live-session-participants',
    where: { liveSession: { equals: session.id } },
    limit: 1000,
    depth: 0,
  })
  for (const log of logs.docs as any[]) {
    const uid = idOf(log.user)
    if (log.sfuSessionId) await forceCloseParticipantTracks(log.sfuSessionId, uid)
    if (!log.leftAt) {
      const interval = Math.max(0, Math.floor((nowMs - new Date(log.joinedAt).getTime()) / 1000))
      await payload
        .update({
          collection: 'live-session-participants',
          id: log.id,
          data: { leftAt: nowIso, durationSeconds: (Number(log.durationSeconds) || 0) + interval } as any,
        })
        .catch(() => {})
    }
  }

  // Kick everyone off the data plane (their tokens are scoped to this session).
  const clientIds = [...new Set((logs.docs as any[]).map((l) => idOf(l.user)))]
  await revokeAblyTokens(clientIds).catch(() => {})

  const startedMs = new Date(session.startedAt || session.createdAt).getTime()
  // NOT best-effort: if the status write fails the session stays `live` and the
  // teardown above already ran — let it throw so the caller (cron) logs + retries
  // on the next pass rather than leaving a half-ended, un-marked room.
  await payload.update({
    collection: 'live-sessions',
    id: session.id,
    data: {
      status: 'ended',
      endedAt: nowIso,
      durationMinutes: Math.max(1, Math.ceil((nowMs - startedMs) / 60000)),
    } as any,
  })

  void reason
}

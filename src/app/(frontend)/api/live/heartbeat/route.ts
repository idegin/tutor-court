import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CREDIT_RATE } from '@/lib/constants'
import { resolveSessionAccess } from '@/lib/live/access'
import { rateLimit } from '@/lib/live/rate-limit'
import { settleBilling, endLiveSession } from '@/lib/live/lifecycle'

export const runtime = 'nodejs'

const idOfTutor = (session: any): string =>
  String(typeof session?.tutor === 'object' ? session.tutor?.id : session?.tutor)

// Real per-minute billing driver (Phase 6). The tutor's client posts this every
// ~20s while the class is live. It charges the elapsed minutes, bumps
// lastHeartbeatAt (so the sweep cron knows the session is alive), and auto-ends
// the class when the wallet hits zero. Host-only — the wallet is the tutor's.
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const limited = rateLimit(`hb:${user.id}`, 12, 60) // ~1 / 5s
  if (!limited.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } })
  }

  const access = await resolveSessionAccess(payload, body?.sessionId, user)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  if (!access.isHost) {
    return NextResponse.json({ error: 'Only the tutor drives billing.' }, { status: 403 })
  }
  const session = access.session
  if (session.status !== 'live') {
    return NextResponse.json({ status: session.status, ended: true })
  }

  const now = Date.now()

  // Presence reconcile: the tutor's client sends the Ably presence roster it can
  // see. Any participant with an OPEN log who is NOT present (closed their tab /
  // dropped network without firing the /leave beacon) is checked out here, so
  // their ghost log stops accruing billable minutes every beat. Guarded: we only
  // trust a non-empty roster (an empty/absent list means the client couldn't
  // read presence — never mass-checkout on that).
  const activeRaw = Array.isArray(body?.activeUserIds) ? body.activeUserIds : null
  if (activeRaw && activeRaw.length > 0) {
    const present = new Set(activeRaw.map((v: unknown) => String(v)))
    present.add(String(idOfTutor(session))) // never check out the host
    const openLogs = await payload
      .find({
        collection: 'live-session-participants',
        where: { and: [{ liveSession: { equals: session.id } }, { leftAt: { exists: false } }] },
        limit: 1000,
        depth: 0,
      })
      .catch(() => null)
    for (const log of (openLogs?.docs ?? []) as any[]) {
      const uid = String(typeof log.user === 'object' ? log.user?.id : log.user)
      if (present.has(uid)) continue
      // Grace window: a student who joined seconds ago may not have propagated
      // into the tutor's presence roster yet — don't check them out on that race.
      const joinedMs = new Date(log.joinedAt).getTime()
      if (now - joinedMs < 45_000) continue
      const interval = Math.max(0, Math.floor((now - joinedMs) / 1000))
      await payload
        .update({
          collection: 'live-session-participants',
          id: log.id,
          data: { leftAt: new Date(now).toISOString(), durationSeconds: (Number(log.durationSeconds) || 0) + interval } as any,
        })
        .catch(() => {})
    }
  }

  const result = await settleBilling(payload, session, now)

  await payload
    .update({ collection: 'live-sessions', id: session.id, data: { lastHeartbeatAt: new Date(now).toISOString() } as any })
    .catch(() => {})

  // Out of credits → end the class (skipped for escrow-funded classes).
  if (result.empty) {
    await endLiveSession(payload, session, 'out_of_credits')
    return NextResponse.json({ ended: true, reason: 'out_of_credits', balance: 0, consumed: result.consumed })
  }

  const minutesRemaining =
    CREDIT_RATE.coinsPerMinute > 0 ? Math.floor(result.balance / CREDIT_RATE.coinsPerMinute) : null
  return NextResponse.json(
    {
      ended: false,
      balance: result.balance,
      consumed: result.consumed,
      minutesRemaining,
      lowCredit: minutesRemaining !== null && minutesRemaining <= 10,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

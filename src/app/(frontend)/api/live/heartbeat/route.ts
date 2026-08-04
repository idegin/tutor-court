import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CREDIT_RATE } from '@/lib/constants'
import { resolveSessionAccess } from '@/lib/live/access'
import { rateLimit } from '@/lib/live/rate-limit'
import { settleBilling, endLiveSession } from '@/lib/live/lifecycle'

export const runtime = 'nodejs'

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

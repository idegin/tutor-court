import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { endLiveSession } from '@/lib/live/lifecycle'

export const runtime = 'nodejs'

// Cron: end abandoned live sessions. Without a background worker a class whose
// tutor tab dies stays `live` forever, keeping the room open and (in real mode)
// never settling final billing. This sweeps any live session whose tutor
// heartbeat has gone stale, or that has simply run past a hard ceiling, and ends
// it authoritatively (settle billing + close logs + revoke tokens + close SFU).
//
// Protect with CRON_SECRET (Bearer). Schedule every few minutes via Vercel Cron
// (see vercel.json) or any free scheduler (Upstash QStash / cron-job.org /
// GitHub Actions) hitting this URL with `Authorization: Bearer $CRON_SECRET`.

const STALE_HEARTBEAT_MS = 3 * 60 * 1000 // no tutor heartbeat for 3 min → abandoned
const MAX_SESSION_AGE_MS = 6 * 60 * 60 * 1000 // hard ceiling

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 })
  const provided = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (provided !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await getPayload({ config })
  const now = Date.now()

  const live = await payload.find({
    collection: 'live-sessions',
    where: { status: { equals: 'live' } },
    limit: 500,
    depth: 0,
  })

  let ended = 0
  for (const session of live.docs as any[]) {
    const lastBeat = session.lastHeartbeatAt ? new Date(session.lastHeartbeatAt).getTime() : null
    const startedMs = new Date(session.startedAt || session.createdAt).getTime()
    // Grace: a brand-new session may not have heartbeated yet — only sweep on a
    // stale heartbeat (once one exists) or the absolute age ceiling.
    const heartbeatStale = lastBeat !== null && now - lastBeat > STALE_HEARTBEAT_MS
    const tooOld = now - startedMs > MAX_SESSION_AGE_MS
    const neverBeatButOld = lastBeat === null && now - startedMs > STALE_HEARTBEAT_MS
    if (heartbeatStale || tooOld || neverBeatButOld) {
      await endLiveSession(payload, session, 'abandoned').catch((err) =>
        console.error('[cron/live-sweep] failed to end session', session.id, err),
      )
      ended++
    }
  }

  return NextResponse.json({ ok: true, scanned: live.docs.length, ended })
}

export const GET = handle
export const POST = handle

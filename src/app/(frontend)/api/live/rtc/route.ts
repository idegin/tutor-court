import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isSfuConfigured } from '@/lib/live/config'
import { resolveSessionAccess } from '@/lib/live/access'
import { rateLimit } from '@/lib/live/rate-limit'
import {
  createSfuSession,
  newTracks,
  renegotiate,
  closeTracks,
  type SessionDescription,
  type TrackObject,
} from '@/lib/live/cf-realtime'

export const runtime = 'nodejs'

// Signalling proxy for the Cloudflare Realtime SFU. The browser never holds the
// app secret: it POSTs its SDP offer/answer + track descriptors here, we attach
// the Bearer secret and forward to Cloudflare, and relay the SDP answer back.
//
// One SFU session == one browser PeerConnection. Each participant creates their
// OWN session, publishes their local tracks, and pulls other participants'
// (sessionId, trackName) pairs — which are discovered via Ably presence (Phase 4).
//
// Actions (POST body.action):
//   'session'     → create a new SFU session for this client
//   'tracks'      → publish local tracks (with offer) OR pull remote tracks
//   'renegotiate' → complete an SFU-initiated renegotiation (answer)
//   'close'       → stop tracks on this client's session

interface RtcBody {
  action: 'session' | 'tracks' | 'renegotiate' | 'close'
  sessionId: string | number // the LIVE session (for authorization)
  sfuSessionId?: string
  sessionDescription?: SessionDescription
  tracks?: TrackObject[]
}

export async function POST(request: Request) {
  if (!isSfuConfigured()) {
    return NextResponse.json({ error: 'realtime_not_configured' }, { status: 503 })
  }

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  let body: RtcBody
  try {
    body = (await request.json()) as RtcBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  // Membership gate on the LIVE session (also rejects ended/cancelled).
  const access = await resolveSessionAccess(payload, body.sessionId, user)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  // Rate-limit signalling per user+session (SFU allows 50 calls/s/session; this
  // is a generous abuse bound, not the media path).
  const limited = rateLimit(`rtc:${user.id}:${access.sessionId}`, 40, 10)
  if (!limited.allowed) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  try {
    switch (body.action) {
      case 'session': {
        // Require a participant row (the client must /join first) so the SFU
        // session is bound to a known user — ownership is authoritative on the
        // server-minted id, never client-asserted.
        const log = await findParticipantLog(payload, access.sessionId!, user.id)
        if (!log) {
          return NextResponse.json({ error: 'Join the class before connecting media.' }, { status: 409 })
        }
        const created = await createSfuSession()
        // Authoritative: if we can't persist the ownership binding, later
        // publish/close would 403 and leave can't tear down — so fail the action
        // (throws → 502) and let the client retry rather than orphan a session.
        await payload.update({
          collection: 'live-session-participants',
          id: log.id,
          data: { sfuSessionId: created.sessionId } as any,
        })
        return NextResponse.json(created, { headers: noStore })
      }

      case 'tracks': {
        if (!body.sfuSessionId || !body.tracks) {
          return NextResponse.json({ error: 'sfuSessionId and tracks are required.' }, { status: 400 })
        }
        await assertOwnsSession(payload, access.sessionId!, user.id, body.sfuSessionId)
        // Observers (parents) may pull but never publish. A publish is any
        // tracks/new that carries an OFFER (pulls carry none) or an explicit
        // location:'local' — gate on both so omitting `location` can't bypass it.
        const localTracks = body.tracks.filter(
          (t) => t.location === 'local' || (body.sessionDescription?.type === 'offer' && t.location !== 'remote'),
        )
        const publishesLocal = body.sessionDescription?.type === 'offer' || localTracks.length > 0
        if (publishesLocal && !access.canPublish) {
          return NextResponse.json({ error: 'You are not allowed to publish media.' }, { status: 403 })
        }
        // Bind published track names to the authenticated identity. Ownership of
        // the SFU session alone doesn't stop a publisher naming their track
        // `${victimId}-video`; peers pull by trackName off presence, and the
        // server's teardown (`forceCloseParticipantTracks`) keys on `${userId}-*`,
        // so a mislabeled track would dodge kick/demote. Enforce the convention here.
        const ownsAllNames = localTracks.every(
          (t) => !t.trackName || t.trackName.startsWith(`${user.id}-`),
        )
        if (publishesLocal && !ownsAllNames) {
          return NextResponse.json(
            { error: 'Published track names must be scoped to your own identity.' },
            { status: 403 },
          )
        }
        const res = await newTracks(body.sfuSessionId, {
          sessionDescription: body.sessionDescription,
          tracks: body.tracks,
        })
        return NextResponse.json(res, { headers: noStore })
      }

      case 'renegotiate': {
        if (!body.sfuSessionId || !body.sessionDescription) {
          return NextResponse.json({ error: 'sfuSessionId and sessionDescription are required.' }, { status: 400 })
        }
        await assertOwnsSession(payload, access.sessionId!, user.id, body.sfuSessionId)
        const res = await renegotiate(body.sfuSessionId, body.sessionDescription)
        return NextResponse.json(res, { headers: noStore })
      }

      case 'close': {
        if (!body.sfuSessionId || !body.tracks) {
          return NextResponse.json({ error: 'sfuSessionId and tracks are required.' }, { status: 400 })
        }
        await assertOwnsSession(payload, access.sessionId!, user.id, body.sfuSessionId)
        const res = await closeTracks(body.sfuSessionId, body.tracks, body.sessionDescription)
        return NextResponse.json(res, { headers: noStore })
      }

      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
    }
  } catch (err) {
    if (err instanceof OwnershipError) {
      return NextResponse.json({ error: 'You do not own that media session.' }, { status: 403 })
    }
    console.error('[live/rtc] error:', err)
    return NextResponse.json({ error: 'Realtime signalling failed.' }, { status: 502 })
  }
}

const noStore = { 'Cache-Control': 'no-store' }

class OwnershipError extends Error {}

async function findParticipantLog(
  payload: any,
  liveSessionId: number,
  userId: number | string,
): Promise<any | null> {
  const found = await payload
    .find({
      collection: 'live-session-participants',
      where: { and: [{ liveSession: { equals: liveSessionId } }, { user: { equals: userId } }] },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
    })
    .catch(() => null)
  return found?.docs?.[0] ?? null
}

// Verify the caller owns the SFU session they're acting on. FAIL CLOSED: no
// participant row, or an unbound / mismatched sfuSessionId, is a 403. This is
// what stops a student from closing/renegotiating the tutor's media session
// (whose id is visible via presence). The binding is written server-side in the
// 'session' action against the id Cloudflare just minted, so it can't be forged.
async function assertOwnsSession(
  payload: any,
  liveSessionId: number,
  userId: number | string,
  sfuSessionId: string,
): Promise<void> {
  const log = await findParticipantLog(payload, liveSessionId, userId)
  if (!log || !log.sfuSessionId) throw new OwnershipError()
  if (String(log.sfuSessionId) !== String(sfuSessionId)) throw new OwnershipError()
}

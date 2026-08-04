import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { isAblyConfigured } from '@/lib/live/config'
import { createAblyTokenRequest, participantCapability } from '@/lib/live/ably-server'
import { resolveSessionAccess } from '@/lib/live/access'
import { rateLimit } from '@/lib/live/rate-limit'

// Pin the Node runtime: crypto (HMAC) + Payload are Node-only.
export const runtime = 'nodejs'

// Mint a short-lived, capability-scoped Ably TokenRequest for a session member.
// The browser calls this from ably-js's authCallback; only members of the
// session's class get a token, only the host gets control/whiteboard publish,
// and parents (observers) get subscribe/presence only.
export async function GET(request: Request) {
  if (!isAblyConfigured()) {
    return NextResponse.json({ error: 'realtime_not_configured' }, { status: 503 })
  }

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const limited = rateLimit(`ably:${user.id}`, 10, 60)
  if (!limited.allowed) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  const sessionId = new URL(request.url).searchParams.get('sessionId')
  const access = await resolveSessionAccess(payload, sessionId, user)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  // Build the channel/capability from the NORMALIZED integer id (access.sessionId),
  // never the raw query param — so this token targets the same `live:<id>`
  // channel every other client subscribes to.
  const tokenRequest = createAblyTokenRequest({
    clientId: String(user.id),
    capability: participantCapability(access.sessionId!, {
      isHost: Boolean(access.isHost),
      // DATA-plane publish (chat/reactions/hands): every non-observer, regardless
      // of media stage status. Media publish is gated separately in /api/live/rtc.
      canPublish: access.role !== 'observer',
      // Whiteboard publish for non-hosts follows the session's writable toggle
      // (server-enforced). The host toggling it re-mints student tokens.
      whiteboardWritable: Boolean(access.session?.whiteboardWritable),
    }),
  })

  return NextResponse.json(tokenRequest, { headers: { 'Cache-Control': 'no-store' } })
}

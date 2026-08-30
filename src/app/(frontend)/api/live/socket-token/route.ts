import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { resolveSessionAccess } from '@/lib/live/access'
import { rateLimit } from '@/lib/live/rate-limit'
import { signSocketToken } from '@/lib/live/socket-auth'

// Pin the Node runtime: crypto (HMAC) + Payload are Node-only.
export const runtime = 'nodejs'

// Mint a short-lived, signed token that authorizes a Socket.IO connection to a
// live session. Replaces the old Ably TokenRequest: the browser fetches this,
// then hands it to the socket handshake (auth.token). Only members of the
// session's class get a token; the claims carry the host flag + publish/
// whiteboard rights the socket server enforces. Media itself is peer-to-peer.
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const limited = rateLimit(`sock:${user.id}`, 10, 60)
  if (!limited.allowed) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  const sessionId = new URL(request.url).searchParams.get('sessionId')
  const access = await resolveSessionAccess(payload, sessionId, user)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const name =
    `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim() || user.email
  const accountType = (user.accountType === 'tutor'
    ? 'tutor'
    : user.accountType === 'parent'
      ? 'parent'
      : 'student') as 'tutor' | 'student' | 'parent'

  const token = signSocketToken({
    sub: String(user.id),
    sid: String(access.sessionId),
    name,
    accountType,
    // Matches the identity role the page assigns (students display as viewers);
    // media publish is governed by `canPublish`, not this cosmetic label.
    role: access.isHost ? 'host' : 'viewer',
    // DATA-plane publish (chat/reactions/hands): every non-observer. Parents
    // observe only. Media publish for students follows the same flag here; a
    // demoted student simply stops sending tracks client-side.
    canPublish: Boolean(access.canPublish),
    isHost: Boolean(access.isHost),
    // Whiteboard draw for non-hosts follows the session's writable toggle
    // (server-enforced on each op). The host toggling it broadcasts a live
    // update, so the grant tracks the current state without a token re-mint.
    whiteboardWritable: Boolean(access.session?.whiteboardWritable),
  })

  return NextResponse.json({ token }, { headers: { 'Cache-Control': 'no-store' } })
}

import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateIceServers } from '@/lib/live/turn'
import { resolveSessionAccess } from '@/lib/live/access'
import { rateLimit } from '@/lib/live/rate-limit'

// Pin the Node runtime: this route uses AbortSignal.timeout + Payload (Node-only).
export const runtime = 'nodejs'

// Short-lived ICE servers (STUN + TURN) for the local RTCPeerConnection. Gated
// by session membership + rate-limited — TURN relay is metered Cloudflare
// bandwidth, so only confirmed members may mint credentials, and not in a loop.
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const limited = rateLimit(`ice:${user.id}`, 10, 60)
  if (!limited.allowed) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  const sessionId = new URL(request.url).searchParams.get('sessionId')
  const access = await resolveSessionAccess(payload, sessionId, user)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  // Short TTL: credentials can't be revoked, so keep them cheap to re-mint and
  // refresh client-side rather than issuing long-lived relay access.
  const { iceServers, degraded } = await generateIceServers(3600)
  if (degraded) {
    console.warn(`[live/ice] TURN unavailable for session ${access.sessionId} — serving STUN only`)
  }
  return NextResponse.json({ iceServers, degraded }, { headers: { 'Cache-Control': 'no-store' } })
}

import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { liveCapabilities } from '@/lib/live/config'
import { generateIceServers } from '@/lib/live/turn'
import { resolveSessionAccess } from '@/lib/live/access'

export const runtime = 'nodejs'

// Live-classroom self-diagnostics. Media is a peer-to-peer WebRTC mesh signalled
// over our own Socket.IO server, so the only external dependency that can be
// "degraded" is the Cloudflare TURN relay. This reports the caller's access to a
// session plus whether a working TURN relay is available (without it, cross-NAT
// audio/video can fail even though presence/chat/signalling work fine).
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const caps = liveCapabilities()
  const sessionId = new URL(request.url).searchParams.get('sessionId')
  const access = await resolveSessionAccess(payload, sessionId, user)

  const result: any = {
    config: caps, // { turn, mesh, ready }
    access: access.ok
      ? { ok: true, role: access.role, canPublish: access.canPublish, isHost: access.isHost, sessionId: access.sessionId }
      : { ok: false, error: access.error, status: access.status },
  }

  // ICE / TURN reachability — the mesh needs a working TURN relay to traverse
  // restrictive NATs. If this is degraded / has no turn: URLs, cross-network
  // audio/video will fail even though presence + chat work fine.
  try {
    const ice = await generateIceServers(60)
    const urls = ice.iceServers.flatMap((s) => (Array.isArray(s.urls) ? s.urls : [s.urls]))
    result.ice = {
      turnConfigured: caps.turn,
      degraded: ice.degraded,
      hasTurn: urls.some((u) => u.startsWith('turn:') || u.startsWith('turns:')),
      urls,
    }
  } catch (err: any) {
    result.ice = { turnConfigured: caps.turn, error: err?.message ?? String(err) }
  }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}

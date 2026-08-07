import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { liveCapabilities, liveConfig, isAblyConfigured } from '@/lib/live/config'
import { createAblyTokenRequest, participantCapability } from '@/lib/live/ably-server'
import { resolveSessionAccess } from '@/lib/live/access'

export const runtime = 'nodejs'

// Live-classroom self-diagnostics. Given a session, reports what the backend is
// configured for AND — the useful part — what capabilities Ably actually GRANTS
// this key (by minting a token and reading the intersection Ably returns). A
// subscribe-only / mis-scoped key surfaces here as presence:false / publish:false
// instead of a silent dead room. Gated to session members.
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const caps = liveCapabilities()
  const sessionId = new URL(request.url).searchParams.get('sessionId')
  const access = await resolveSessionAccess(payload, sessionId, user)

  const result: any = {
    config: caps, // { turn, sfu, ably, ready }
    access: access.ok
      ? { ok: true, role: access.role, canPublish: access.canPublish, isHost: access.isHost, sessionId: access.sessionId }
      : { ok: false, error: access.error, status: access.status },
    ably: { configured: isAblyConfigured(), tested: false } as any,
  }

  // Ask Ably what it actually grants: mint a HOST-capability token request and
  // read back the granted capability. Ably returns the intersection with the
  // key's own capability, so a restricted key shows reduced ops here.
  if (isAblyConfigured() && access.ok) {
    try {
      const tokenRequest = createAblyTokenRequest({
        clientId: String(user.id),
        capability: participantCapability(access.sessionId!, {
          isHost: true,
          canPublish: true,
          whiteboardWritable: true,
        }),
      })
      const res = await fetch(
        `https://rest.ably.io/keys/${encodeURIComponent(tokenRequest.keyName)}/requestToken`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tokenRequest),
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        },
      )
      const text = await res.text()
      if (!res.ok) {
        result.ably = { configured: true, tested: true, ok: false, error: `Ably HTTP ${res.status}: ${text.slice(0, 300)}` }
      } else {
        const token = JSON.parse(text)
        const granted = JSON.parse(token.capability || '{}') as Record<string, string[]>
        const base = `live:${access.sessionId}`
        const ops = granted[base] || []
        result.ably = {
          configured: true,
          tested: true,
          ok: true,
          keyName: tokenRequest.keyName,
          grantedOps: ops,
          presence: ops.includes('presence'),
          publish: ops.includes('publish'),
          subscribe: ops.includes('subscribe'),
          // The two capabilities the live class REQUIRES to work at all.
          usable: ops.includes('presence') && ops.includes('publish'),
        }
      }
    } catch (err: any) {
      result.ably = { configured: true, tested: true, ok: false, error: err?.message ?? String(err) }
    }
  }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}

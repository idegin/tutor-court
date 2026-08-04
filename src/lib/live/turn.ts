import { liveConfig, isTurnConfigured } from './config'

// Short-lived TURN/STUN credentials from Cloudflare's TURN service. The static
// API token NEVER reaches the browser — the server mints a per-session
// credential (default TTL 1h) that the client feeds into RTCPeerConnection as
// iceServers. Cloudflare's TURN also returns a STUN URL.
//
// Docs: https://developers.cloudflare.com/realtime/turn/

export interface IceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

const TURN_ENDPOINT = (keyId: string) =>
  `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`

/**
 * Generate ICE servers for a client. `ttlSeconds` bounds how long the returned
 * credential is valid — keep it short (default 1h) and re-mint client-side,
 * since a leaked credential can't be revoked before it expires. Returns a
 * STUN-only fallback when TURN isn't configured or the request fails (direct/
 * host candidates still work on open NATs).
 */
export interface IceResult {
  iceServers: IceServer[]
  /** True when TURN was expected but unavailable → STUN-only (peers behind
   *  symmetric NAT/CGNAT may fail to connect). Callers should log/alert. */
  degraded: boolean
}

export async function generateIceServers(ttlSeconds = 3600): Promise<IceResult> {
  const stunOnly: IceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }]

  // No TURN configured is an expected mode (not degraded) — dev / open-NAT use.
  if (!isTurnConfigured()) return { iceServers: stunOnly, degraded: false }

  try {
    const res = await fetch(TURN_ENDPOINT(liveConfig.turn.keyId!), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${liveConfig.turn.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl: ttlSeconds }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error('[live/turn] credential generation failed:', res.status, await safeText(res))
      return { iceServers: stunOnly, degraded: true }
    }

    // generate-ice-servers returns `{ iceServers: [...] }` already containing
    // Cloudflare's STUN entry plus the TURN entry (with username/credential).
    const data = (await res.json()) as { iceServers?: IceServer | IceServer[] }
    const ice = data.iceServers
    if (!ice) return { iceServers: stunOnly, degraded: true }
    return { iceServers: Array.isArray(ice) ? ice : [ice], degraded: false }
  } catch (err) {
    console.error('[live/turn] credential generation error:', err)
    return { iceServers: stunOnly, degraded: true }
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return '<no body>'
  }
}

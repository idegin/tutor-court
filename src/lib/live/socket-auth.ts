import crypto from 'crypto'
import type { SocketTokenClaims } from './socket-types'

// Signed, short-lived token that authorizes a Socket.IO connection to a live
// session. Minted by /api/live/socket-token (which runs the full Payload
// membership check via resolveSessionAccess) and verified by the custom socket
// server — so authorization logic stays in the Next API route with DB access,
// and the socket layer only has to trust a signature.
//
// This is a minimal HS256 JWT signed with PAYLOAD_SECRET (no extra dependency),
// mirroring the HMAC approach the old ably-server used for TokenRequests.

function secret(): string {
  const s = process.env.PAYLOAD_SECRET
  if (!s) throw new Error('PAYLOAD_SECRET is required to sign live-session socket tokens.')
  return s
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function b64urlJson(obj: unknown): string {
  return b64url(JSON.stringify(obj))
}

function sign(data: string): string {
  return b64url(crypto.createHmac('sha256', secret()).update(data).digest())
}

/** Default token lifetime — short, so a kicked/ended member can't reconnect for
 *  long. The client re-mints transparently on reconnect. */
const DEFAULT_TTL_SECONDS = 30 * 60

export function signSocketToken(
  claims: Omit<SocketTokenClaims, 'exp'>,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload: SocketTokenClaims = {
    ...claims,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const head = b64urlJson(header)
  const body = b64urlJson(payload)
  const mac = sign(`${head}.${body}`)
  return `${head}.${body}.${mac}`
}

/** Verify signature + expiry. Returns the claims or null if invalid/expired. */
export function verifySocketToken(token: string | undefined | null): SocketTokenClaims | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [head, body, mac] = parts

  // Constant-time signature check.
  const expected = sign(`${head}.${body}`)
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  let claims: SocketTokenClaims
  try {
    claims = JSON.parse(Buffer.from(body, 'base64').toString('utf8'))
  } catch {
    return null
  }
  if (!claims?.exp || claims.exp < Math.floor(Date.now() / 1000)) return null
  return claims
}

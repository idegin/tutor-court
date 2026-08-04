import crypto from 'crypto'
import { liveConfig, isAblyConfigured } from './config'

// Server-side Ably token minting. The browser never receives the root API key —
// it gets a short-lived, capability-scoped signed TokenRequest from
// /api/live/ably-token and hands it to ably-js via an authCallback. We sign the
// TokenRequest ourselves (HMAC-SHA256) so no server SDK is required.
//
// Docs: https://ably.com/docs/core-features/authentication#token-request

export class AblyNotConfiguredError extends Error {
  constructor() {
    super('Ably is not configured (missing ABLY_API_KEY).')
    this.name = 'AblyNotConfiguredError'
  }
}

export interface AblyTokenRequest {
  keyName: string
  ttl: number
  capability: string
  clientId?: string
  timestamp: number
  nonce: string
  mac: string
}

/** Capability map: channel/namespace → allowed operations. */
export type AblyCapability = Record<string, string[]>

function canonicalCapability(cap: AblyCapability): string {
  // Ably expects a canonical capability string: resource keys sorted, each op
  // list sorted, no whitespace. We sign and send the SAME string so the mac
  // verifies. JS reorders purely-numeric string keys ahead of insertion order,
  // which would desync the signed string from JSON.stringify's output — guard
  // against it (our channel names are always `live:...`, never numeric).
  const sorted: AblyCapability = {}
  for (const key of Object.keys(cap).sort()) {
    if (/^\d+$/.test(key)) throw new Error(`Ably capability channel must not be purely numeric: ${key}`)
    sorted[key] = [...cap[key]].sort()
  }
  return JSON.stringify(sorted)
}

/**
 * Build and sign an Ably TokenRequest.
 * @param clientId  stable identity (the app user id) — enables presence + who-sent-what.
 * @param capability channels this token may touch and with which ops.
 * @param ttlMs      lifetime; default 1h.
 */
export function createAblyTokenRequest(params: {
  clientId: string
  capability: AblyCapability
  ttlMs?: number
}): AblyTokenRequest {
  if (!isAblyConfigured()) throw new AblyNotConfiguredError()

  const apiKey = liveConfig.ably.apiKey!
  const sep = apiKey.indexOf(':')
  if (sep === -1) throw new Error('ABLY_API_KEY is malformed (expected "appId.keyId:secret").')
  const keyName = apiKey.slice(0, sep)
  const keySecret = apiKey.slice(sep + 1)

  // A non-empty clientId is REQUIRED — Ably presence (the participant roster)
  // depends on it, and an empty id would silently break presence.
  if (!params.clientId || params.clientId.trim() === '') {
    throw new Error('createAblyTokenRequest: clientId is required for presence.')
  }

  // Short TTL: a token for an ended session / removed user should die fast and
  // force a re-auth, which /api/live/ably-token then refuses (409/403). Clients
  // renew transparently via authCallback.
  const ttl = params.ttlMs ?? 5 * 60 * 1000
  const capability = canonicalCapability(params.capability)
  const clientId = params.clientId
  const timestamp = Date.now()
  const nonce = crypto.randomBytes(16).toString('hex')

  // Signature text: fields in fixed order, each terminated by a newline.
  const signText = `${keyName}\n${ttl}\n${capability}\n${clientId}\n${timestamp}\n${nonce}\n`
  const mac = crypto.createHmac('sha256', keySecret).update(signText).digest('base64')

  return { keyName, ttl, capability, clientId, timestamp, nonce, mac }
}

/**
 * Revoke all Ably tokens for the given clientIds (app user ids) — the data-plane
 * half of "remove from class": the kicked user is dropped from presence/chat and
 * can't re-auth (the ably-token route refuses a removed participant on re-issue).
 * Best-effort; requires "Revocable tokens" enabled on the Ably key. No-ops when
 * Ably isn't configured.
 *
 * Docs: https://ably.com/docs/auth/revocation
 */
export async function revokeAblyTokens(clientIds: string[]): Promise<void> {
  if (!isAblyConfigured() || clientIds.length === 0) return
  const apiKey = liveConfig.ably.apiKey!
  const sep = apiKey.indexOf(':')
  if (sep === -1) return
  const keyName = apiKey.slice(0, sep)
  try {
    const res = await fetch(`https://rest.ably.io/keys/${encodeURIComponent(keyName)}/revokeTokens`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targets: clientIds.map((id) => `clientId:${id}`) }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) console.error('[live/ably] token revocation failed:', res.status, await res.text().catch(() => ''))
  } catch (err) {
    console.error('[live/ably] token revocation error:', err)
  }
}

/** Standard channel name for a live session's realtime data plane. */
export function sessionChannel(sessionId: string | number): string {
  return `live:${sessionId}`
}

/**
 * Capability for a participant on a session.
 *  - host: publishes everywhere including control + whiteboard.
 *  - publisher (student): publishes chat/reactions/hands + base presence.
 *  - observer (parent): subscribe + presence only — no publishing anywhere.
 * Control (kick/mute-all/start-stop) is host-publish-only for everyone else.
 */
export function participantCapability(
  sessionId: string | number,
  opts: { isHost: boolean; canPublish?: boolean },
): AblyCapability {
  const base = sessionChannel(sessionId)
  const { isHost, canPublish = true } = opts
  const full = ['subscribe', 'publish', 'presence']
  const watch = ['subscribe', 'presence']
  const memberOps = canPublish ? full : watch

  return {
    [base]: memberOps,
    [`${base}:chat`]: memberOps,
    [`${base}:reactions`]: memberOps,
    [`${base}:hands`]: memberOps,
    // Non-observers can publish whiteboard ops (the host's writable toggle
    // decides who actually draws, enforced client-side); observers watch.
    [`${base}:whiteboard`]: canPublish ? full : watch,
    // Control channel: only the host may publish (kick, mute-all, start/stop).
    [`${base}:control`]: isHost ? full : ['subscribe'],
  }
}

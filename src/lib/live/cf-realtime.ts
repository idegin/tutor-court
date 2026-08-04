import { liveConfig, isSfuConfigured } from './config'

// Server wrapper over the Cloudflare Realtime (Calls) SFU REST API. The app
// secret stays server-side: the browser negotiates media by POSTing SDP to our
// own /api/live/rtc/* proxy routes (Phase 3), which call these functions with
// the Bearer secret attached.
//
// Docs: https://developers.cloudflare.com/realtime/https-api/

export class SfuNotConfiguredError extends Error {
  constructor() {
    super('Cloudflare Realtime SFU is not configured (missing app id/secret).')
    this.name = 'SfuNotConfiguredError'
  }
}

export interface SessionDescription {
  type: 'offer' | 'answer'
  sdp: string
}

export interface TrackObject {
  location?: 'local' | 'remote'
  mid?: string | null
  trackName?: string
  sessionId?: string // for remote tracks: the publisher's SFU session id
}

interface NewTracksBody {
  sessionDescription?: SessionDescription
  tracks: TrackObject[]
}

interface TracksResponse {
  requiresImmediateRenegotiation?: boolean
  sessionDescription?: SessionDescription
  tracks?: (TrackObject & { errorCode?: string; errorDescription?: string })[]
  errorCode?: string
  errorDescription?: string
}

function appBase(): string {
  // Normalize so the base works whether or not the env value includes `/v1`
  // and regardless of a trailing slash.
  let base = liveConfig.sfu.baseUrl.replace(/\/+$/, '')
  if (!/\/v1$/.test(base)) base += '/v1'
  return `${base}/apps/${liveConfig.sfu.appId}`
}

async function sfuFetch<T>(path: string, init: RequestInit): Promise<T> {
  if (!isSfuConfigured()) throw new SfuNotConfiguredError()
  const res = await fetch(`${appBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${liveConfig.sfu.appSecret}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`[live/sfu] ${init.method} ${path} → ${res.status}: ${text || '<no body>'}`)
  }
  try {
    return text ? (JSON.parse(text) as T) : ({} as T)
  } catch {
    throw new Error(`[live/sfu] ${init.method} ${path} → malformed JSON response`)
  }
}

/** Create a new SFU session; returns the Cloudflare session id. */
export async function createSfuSession(): Promise<{ sessionId: string }> {
  return sfuFetch('/sessions/new', { method: 'POST' })
}

/**
 * Publish local tracks (client offer → SFU answer) or subscribe to remote
 * tracks. For local tracks pass the client's offer as `sessionDescription`; for
 * remote tracks pass the publisher's `sessionId` + `trackName` per track.
 */
export async function newTracks(sessionId: string, body: NewTracksBody): Promise<TracksResponse> {
  return sfuFetch(`/sessions/${encodeURIComponent(sessionId)}/tracks/new`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** Complete a renegotiation started by the SFU (answer from the client). */
export async function renegotiate(sessionId: string, sessionDescription: SessionDescription): Promise<TracksResponse> {
  return sfuFetch(`/sessions/${encodeURIComponent(sessionId)}/renegotiate`, {
    method: 'PUT',
    body: JSON.stringify({ sessionDescription }),
  })
}

/**
 * Durable server-side teardown of a participant's published media. The client's
 * pc.close() + unload beacon are best-effort; this is the authoritative backstop
 * called when the participant's log is closed (leave) or the session ends, so a
 * killed tab can't leave tracks forwarding past Cloudflare's own ICE timeout.
 *
 * Relies on the trackName convention `${keyPrefix}-audio|video` (keyPrefix is the
 * publisher's user id), which the SFU client publishes with.
 */
export async function forceCloseParticipantTracks(sfuSessionId: string, keyPrefix: string): Promise<void> {
  if (!sfuSessionId || !isSfuConfigured()) return
  await closeTracks(sfuSessionId, [
    { trackName: `${keyPrefix}-audio` },
    { trackName: `${keyPrefix}-video` },
  ]).catch((err) => console.error('[live/sfu] forceCloseParticipantTracks failed:', err))
}

/** Close (stop) tracks on a session — e.g. when a publisher leaves the stage. */
export async function closeTracks(
  sessionId: string,
  tracks: TrackObject[],
  sessionDescription?: SessionDescription,
): Promise<TracksResponse> {
  return sfuFetch(`/sessions/${encodeURIComponent(sessionId)}/tracks/close`, {
    method: 'PUT',
    body: JSON.stringify({ tracks, sessionDescription, force: !sessionDescription }),
  })
}

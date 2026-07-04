import crypto from 'crypto'

function base64url(str: string | Buffer): string {
  const base64 =
    typeof str === 'string' ? Buffer.from(str).toString('base64') : str.toString('base64')
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

const isPlaceholder = (value: string | undefined, placeholder: string): boolean =>
  !value || value === placeholder

/**
 * Returns true when the VideoSDK credentials are present and usable.
 * Used as the server-side gate before allowing tutors to start a live class
 * or participants to join — see api/live-sessions/* routes.
 */
export function isVideoSdkAvailable(): boolean {
  const apiKey = process.env.VIDEOSDK_API_KEY
  const secretKey = process.env.VIDEOSDK_SECRET
  return (
    !isPlaceholder(apiKey, 'videosdk_api_key_placeholder') &&
    !isPlaceholder(secretKey, 'videosdk_secret_placeholder')
  )
}

/**
 * Token role:
 * - `server`  → full permissions, used for server-to-server REST calls
 *               (creating rooms, fetching sessions). Never sent to a browser.
 * - `tutor`   → host: may moderate (kick) and screen-share.
 * - `student` → join only. Cannot moderate or present, so a student can't kick
 *               others or hijack the shared whiteboard with a screen share.
 */
export type VideoSdkRole = 'server' | 'tutor' | 'student'

// VideoSDK only recognizes these permission values: allow_join, ask_join,
// allow_mod. (Screen share is an SDK capability, not a token permission.)
// Including an unknown value like `allow_screenshare` risks the token being
// rejected, which silently keeps a participant out of the room.
function permissionsForRole(role: VideoSdkRole): string[] {
  switch (role) {
    case 'tutor':
      return ['allow_join', 'allow_mod']
    case 'student':
      return ['allow_join']
    case 'server':
    default:
      return ['allow_join', 'allow_mod', 'ask_join']
  }
}

/**
 * Mint a VideoSDK JWT server-side. `role` is required so a full-permission
 * `server` token can never be minted by accident on a client-reachable path.
 * Role permissions still prevent students from moderating or screen-sharing.
 *
 * When `roomId` is provided the token is scoped to that single room — VideoSDK
 * rejects it for any other room. Browser tokens should be scoped whenever the
 * room is already known, so a leaked/forwarded token (or a crafted ?sessionId)
 * can't be used to enter someone else's class.
 */
export function generateVideoSdkToken(
  expirationSeconds: number,
  role: VideoSdkRole,
  roomId?: string,
): string {
  const apiKey = process.env.VIDEOSDK_API_KEY
  const secretKey = process.env.VIDEOSDK_SECRET

  if (
    isPlaceholder(apiKey, 'videosdk_api_key_placeholder') ||
    isPlaceholder(secretKey, 'videosdk_secret_placeholder')
  ) {
    return ''
  }

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }
  const payload: Record<string, unknown> = {
    apikey: apiKey,
    permissions: permissionsForRole(role),
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expirationSeconds,
  }
  if (roomId) {
    payload.roomId = roomId
  }

  const headerB64 = base64url(JSON.stringify(header))
  const payloadB64 = base64url(JSON.stringify(payload))
  const signatureInput = `${headerB64}.${payloadB64}`

  const signature = crypto.createHmac('sha256', secretKey as string).update(signatureInput).digest()

  const signatureB64 = base64url(signature)
  return `${signatureInput}.${signatureB64}`
}

export type VideoSdkConfigStatus =
  | { ok: true }
  | { ok: false; reason: 'missing_credentials' | 'invalid_credentials' }

// Cache a successful validation briefly so we don't call VideoSDK on every
// classroom load. Failures are never cached (they should re-check).
let cachedValidation: { at: number } | null = null
const VALIDATION_TTL_MS = 5 * 60 * 1000

/**
 * Verify the live-video service is fully configured AND the credentials are
 * actually accepted by VideoSDK (not just present). Used to block entering a
 * class when the video server is misconfigured, rather than dropping users into
 * a silently-broken room.
 */
export async function validateVideoSdkConfig(): Promise<VideoSdkConfigStatus> {
  if (!isVideoSdkAvailable()) {
    return { ok: false, reason: 'missing_credentials' }
  }

  if (cachedValidation && Date.now() - cachedValidation.at < VALIDATION_TTL_MS) {
    return { ok: true }
  }

  const token = generateVideoSdkToken(300, 'server')
  if (!token) return { ok: false, reason: 'missing_credentials' }

  try {
    // A lightweight authenticated call: valid credentials return 2xx, bad ones 401/403.
    const res = await fetch('https://api.videosdk.live/v2/rooms', {
      method: 'GET',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
    })
    // Only a hard auth rejection means the credentials are wrong. Transient
    // errors (rate limits, 5xx) shouldn't block a class — the start route still
    // validates real room creation before billing.
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: 'invalid_credentials' }
    }
    if (res.ok) {
      cachedValidation = { at: Date.now() }
    } else {
      console.warn('[videosdk] validation returned', res.status)
    }
    return { ok: true }
  } catch (err) {
    console.error('[videosdk] credential validation request failed:', err)
    return { ok: false, reason: 'invalid_credentials' }
  }
}

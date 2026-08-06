// Central config + feature flags for Live Classroom v2. Every realtime piece is
// independently env-gated so the app degrades gracefully: with only TURN creds
// present you still get ICE, and the media/data planes light up as their keys
// are added. Nothing here throws at import time — callers check the flags.

const env = (key: string): string | undefined => {
  const v = process.env[key]
  return v && v.trim() !== '' ? v.trim() : undefined
}

export const liveConfig = {
  turn: {
    keyId: env('CLOUDFLARE_TURN_KEY_ID'),
    apiToken: env('CLOUDFLARE_TURN_API_TOKEN'),
  },
  sfu: {
    appId: env('CLOUDFLARE_REALTIME_APP_ID'),
    appSecret: env('CLOUDFLARE_REALTIME_APP_SECRET'),
    baseUrl: 'https://rtc.live.cloudflare.com/v1',
  },
  ably: {
    apiKey: env('ABLY_API_KEY'),
  },
  billing: {
    // Prefer a server-only value; fall back to the public one (client display).
    lowCreditThreshold:
      Number(env('LIVE_LOW_CREDIT_THRESHOLD') ?? '40') || 40,
  },
} as const

/** TURN (ICE relay) is usable. */
export function isTurnConfigured(): boolean {
  return Boolean(liveConfig.turn.keyId && liveConfig.turn.apiToken)
}

/** Cloudflare Realtime SFU is usable (group media). */
export function isSfuConfigured(): boolean {
  return Boolean(liveConfig.sfu.appId && liveConfig.sfu.appSecret)
}

/** Ably data plane (chat/presence/whiteboard/signaling) is usable. */
export function isAblyConfigured(): boolean {
  return Boolean(liveConfig.ably.apiKey)
}

/**
 * The whole live-classroom backend is "live" only when media + data planes are
 * both configured. Until then the UI runs on its mock/simulated realtime and
 * we surface a clear "not yet configured" state instead of a silent dead room.
 */
export function isLiveClassroomReady(): boolean {
  return isSfuConfigured() && isAblyConfigured()
}

/** A machine-readable capability snapshot for clients/health checks. */
export function liveCapabilities() {
  return {
    turn: isTurnConfigured(),
    sfu: isSfuConfigured(),
    ably: isAblyConfigured(),
    ready: isLiveClassroomReady(),
  }
}

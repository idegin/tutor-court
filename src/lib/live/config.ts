// Central config + feature flags for Live Classroom. Media is now a direct
// peer-to-peer WebRTC mesh and signalling runs on our own Socket.IO server, so
// the only external dependency is Cloudflare TURN — and even that degrades to
// STUN. Nothing here throws at import time; callers check the flags.

const env = (key: string): string | undefined => {
  const v = process.env[key]
  return v && v.trim() !== '' ? v.trim() : undefined
}

export const liveConfig = {
  turn: {
    keyId: env('CLOUDFLARE_TURN_KEY_ID'),
    apiToken: env('CLOUDFLARE_TURN_API_TOKEN'),
  },
  billing: {
    // Prefer a server-only value; fall back to the public one (client display).
    lowCreditThreshold: Number(env('LIVE_LOW_CREDIT_THRESHOLD') ?? '40') || 40,
  },
} as const

/** TURN (ICE relay) is usable. Optional: without it, mesh calls fall back to
 *  STUN and only connect when both peers are on open-ish NATs. */
export function isTurnConfigured(): boolean {
  return Boolean(liveConfig.turn.keyId && liveConfig.turn.apiToken)
}

/**
 * The live classroom is always available: media is peer-to-peer and signalling
 * runs on this same server, so there is no external realtime key that can be
 * "not configured". (TURN only improves cross-network reliability.)
 */
export function isLiveClassroomReady(): boolean {
  return true
}

/** A machine-readable capability snapshot for clients/health checks. */
export function liveCapabilities() {
  return {
    turn: isTurnConfigured(),
    mesh: true,
    ready: true,
  }
}

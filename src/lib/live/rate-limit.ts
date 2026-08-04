// Best-effort in-memory token-bucket rate limiter for the credential-minting
// routes (ICE / Ably token). Clients only need to mint on join + on ~hourly
// refresh, so a few requests/minute is plenty and this blunts loop-abuse of the
// metered TURN/Ably quotas.
//
// NOTE: this is PER SERVERLESS INSTANCE — on Vercel each cold instance has its
// own map, so it is not a global guarantee. For a hard limit across instances,
// back this with Upstash/Redis. It is deliberately dependency-free for now.

interface Bucket {
  tokens: number
  updatedAt: number
}

const buckets = new Map<string, Bucket>()

// Cap the map so a burst of distinct keys can't grow memory unbounded.
const MAX_KEYS = 10_000

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

/**
 * @param key       identity to limit on (e.g. `ice:<userId>`).
 * @param limit     bucket capacity (max burst).
 * @param perSeconds refill window for a full bucket.
 */
export function rateLimit(key: string, limit = 10, perSeconds = 60): RateLimitResult {
  const now = Date.now()
  const refillRate = limit / (perSeconds * 1000) // tokens per ms

  let b = buckets.get(key)
  if (!b) {
    if (buckets.size >= MAX_KEYS) buckets.clear() // crude but bounded
    b = { tokens: limit, updatedAt: now }
    buckets.set(key, b)
  } else {
    b.tokens = Math.min(limit, b.tokens + (now - b.updatedAt) * refillRate)
    b.updatedAt = now
  }

  if (b.tokens < 1) {
    const needed = 1 - b.tokens
    return { allowed: false, retryAfterSeconds: Math.ceil(needed / refillRate / 1000) }
  }

  b.tokens -= 1
  return { allowed: true, retryAfterSeconds: 0 }
}

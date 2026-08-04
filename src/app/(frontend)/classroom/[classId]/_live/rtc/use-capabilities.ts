'use client'

import * as React from 'react'

// Tells the classroom whether the real realtime backend is configured. Until
// the Cloudflare Realtime + Ably keys are set, `ready` is false and the room
// runs on simulated/mock realtime (clearly indicated in the UI).

export interface LiveCapabilities {
  turn: boolean
  sfu: boolean
  ably: boolean
  ready: boolean
}

const DEFAULT: LiveCapabilities = { turn: false, sfu: false, ably: false, ready: false }

export function useCapabilities(): { caps: LiveCapabilities; loading: boolean } {
  const [caps, setCaps] = React.useState<LiveCapabilities>(DEFAULT)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let alive = true
    fetch('/api/live/capabilities', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : DEFAULT))
      .then((c: LiveCapabilities) => {
        if (alive) setCaps({ ...DEFAULT, ...c })
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  return { caps, loading }
}

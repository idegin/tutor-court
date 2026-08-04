'use client'

import { useCallback, useEffect, useRef } from 'react'

// Meeting sound effects (requirement 9). Two cues live in /public/sfx:
//   sfx-1.mp3 → someone joins / positive events
//   sfx-2.mp3 → new chat message / attention events
// Sounds are opt-out via a mute flag and never block on autoplay policy: the
// first real user gesture (the Join button) unlocks the AudioContext, and we
// no-op gracefully if playback is rejected.

export type Sfx = 'join' | 'message'

const SRC: Record<Sfx, string> = {
  join: '/sfx/sfx-1.mp3',
  message: '/sfx/sfx-2.mp3',
}

export function useSfx(enabled: boolean) {
  const cache = useRef<Partial<Record<Sfx, HTMLAudioElement>>>({})
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    // Preload both cues once on mount so the first play is instant.
    if (typeof Audio === 'undefined') return
    ;(Object.keys(SRC) as Sfx[]).forEach((key) => {
      const el = new Audio(SRC[key])
      el.preload = 'auto'
      el.volume = key === 'message' ? 0.35 : 0.5
      cache.current[key] = el
    })
    return () => {
      cache.current = {}
    }
  }, [])

  return useCallback((sfx: Sfx) => {
    if (!enabledRef.current) return
    const el = cache.current[sfx]
    if (!el) return
    try {
      el.currentTime = 0
      const p = el.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch {
      /* autoplay blocked before first gesture — ignore */
    }
  }, [])
}

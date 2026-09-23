'use client'

import { useCallback, useEffect, useRef } from 'react'

// Meeting sound effects. Two cues ship as files in /public/sfx:
//   sfx-1.mp3 → someone joins / positive events
//   sfx-2.mp3 → new chat message / attention events
// A third cue, `hand`, is synthesized on the fly (a short two-note chime) so a
// distinct hand-raise sound needs no extra asset. Sounds are opt-out via a mute
// flag and never block on autoplay policy: the first real user gesture (the Join
// button) unlocks audio, and we no-op gracefully if playback is rejected.

export type Sfx = 'join' | 'message' | 'hand'

const FILE_SRC: Record<'join' | 'message', string> = {
  join: '/sfx/sfx-1.mp3',
  message: '/sfx/sfx-2.mp3',
}

export function useSfx(enabled: boolean) {
  const cache = useRef<Partial<Record<'join' | 'message', HTMLAudioElement>>>({})
  const acRef = useRef<AudioContext | null>(null)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    // Preload both file cues once on mount so the first play is instant.
    if (typeof Audio === 'undefined') return
    ;(Object.keys(FILE_SRC) as (keyof typeof FILE_SRC)[]).forEach((key) => {
      const el = new Audio(FILE_SRC[key])
      el.preload = 'auto'
      el.volume = key === 'message' ? 0.35 : 0.5
      cache.current[key] = el
    })
    return () => {
      cache.current = {}
      acRef.current?.close().catch(() => {})
      acRef.current = null
    }
  }, [])

  // A short, friendly two-note rising chime for hand raises — distinct from the
  // chat "ding" so it's recognisable without looking at the screen.
  const playHandChime = useCallback(() => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ac = acRef.current ?? new AC()
    acRef.current = ac
    if (ac.state === 'suspended') ac.resume().catch(() => {})
    const now = ac.currentTime
    const notes = [659.25, 987.77] // E5 → B5
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.12
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
      osc.connect(gain).connect(ac.destination)
      osc.start(t)
      osc.stop(t + 0.3)
    })
  }, [])

  return useCallback(
    (sfx: Sfx) => {
      if (!enabledRef.current) return
      if (sfx === 'hand') {
        try {
          playHandChime()
        } catch {
          /* audio not ready — ignore */
        }
        return
      }
      const el = cache.current[sfx]
      if (!el) return
      try {
        el.currentTime = 0
        const p = el.play()
        if (p && typeof p.catch === 'function') p.catch(() => {})
      } catch {
        /* autoplay blocked before first gesture — ignore */
      }
    },
    [playHandChime],
  )
}

'use client'

import * as React from 'react'

/**
 * SSR-safe media query hook. Starts `false` on the server / first paint, then
 * syncs to the real match on the client. Used to decide between the desktop
 * docked side-panel and the mobile bottom sheet (so the sheet's full-screen
 * overlay never blurs the desktop layout).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])

  return matches
}

/** Tailwind's `lg` breakpoint (1024px) and up. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

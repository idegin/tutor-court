'use client'

import { useEffect } from 'react'

// Endpoints whose 401s are normal auth flow (logged-out /me, wrong password on
// login, etc.) and must NOT trigger an auto-redirect.
const IGNORED_PREFIXES = ['/api/users/', '/api/auth/']

function pathFromFetchInput(input: RequestInfo | URL): string | null {
  try {
    const raw =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input instanceof Request
            ? input.url
            : ''
    if (!raw) return null
    // Only care about same-origin requests.
    const url = new URL(raw, window.location.origin)
    if (url.origin !== window.location.origin) return null
    return url.pathname
  } catch {
    return null
  }
}

// Watches for rejected sessions across the whole dashboard. When any of our API
// routes answers 401 (the server has already cleared the stale cookie via
// sessionExpiredResponse), send the user to a clean login instead of leaving
// them staring at a "session expired" toast on a page that looks logged in.
export default function SessionGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const original = window.fetch
    // Avoid stacking patches on fast refresh / re-mounts.
    if ((window.fetch as any).__sessionGuard) return

    let redirecting = false

    const patched: typeof window.fetch = async (input, init) => {
      const res = await original(input, init)
      try {
        if (res.status === 401 && !redirecting) {
          const path = pathFromFetchInput(input)
          const isApi = path?.startsWith('/api/')
          const ignored = path ? IGNORED_PREFIXES.some((p) => path.startsWith(p)) : true
          if (isApi && !ignored) {
            redirecting = true
            const here = window.location.pathname + window.location.search
            window.location.href = `/auth/login?reason=expired&redirect=${encodeURIComponent(here)}`
            // Hang this request so the caller never runs its own error path
            // (e.g. a generic "session timed out" toast) — we're navigating
            // away to a clean login, and the login page shows the message.
            return new Promise<Response>(() => {})
          }
        }
      } catch {
        // Never let the guard break a real request.
      }
      return res
    }

    ;(patched as any).__sessionGuard = true
    window.fetch = patched

    return () => {
      window.fetch = original
    }
  }, [])

  return null
}

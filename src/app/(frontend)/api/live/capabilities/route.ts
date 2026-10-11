import { NextResponse } from 'next/server'
import { getRouteUser } from '@/lib/auth'
import { liveCapabilities } from '@/lib/live/config'

export const runtime = 'nodejs'

// Capability snapshot so the client knows whether the real backend is live or it
// should stay on the simulated/mock realtime. Auth-gated so we don't fingerprint
// infra to anonymous callers. No secrets exposed.
export async function GET() {
  const { user, payload } = await getRouteUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  return NextResponse.json(liveCapabilities(), { headers: { 'Cache-Control': 'no-store' } })
}

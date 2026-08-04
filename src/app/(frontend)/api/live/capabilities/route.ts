import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { liveCapabilities } from '@/lib/live/config'

export const runtime = 'nodejs'

// Capability snapshot so the client knows whether the real backend is live or it
// should stay on the simulated/mock realtime. Auth-gated so we don't fingerprint
// infra to anonymous callers. No secrets exposed.
export async function GET() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  return NextResponse.json(liveCapabilities(), { headers: { 'Cache-Control': 'no-store' } })
}

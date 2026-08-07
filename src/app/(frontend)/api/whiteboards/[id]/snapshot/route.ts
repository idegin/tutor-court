import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { toIntId } from '@/lib/id'

export const runtime = 'nodejs'

const idOf = (v: any) => (v && typeof v === 'object' ? v.id : v)

// Persist the latest stroke snapshot for a whiteboard so a (re)joiner renders the
// current board from the DB immediately, before live Ably ops arrive. Written by
// the board owner or the class tutor (the authoritative drawer). Best-effort +
// size-capped so it can't be used to stash arbitrary large payloads.
const MAX_STROKES = 5000

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const wbId = toIntId(id)
  if (!wbId) return NextResponse.json({ error: 'A valid whiteboard id is required.' }, { status: 400 })

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const snapshot = body?.snapshot
  if (!Array.isArray(snapshot)) {
    return NextResponse.json({ error: 'snapshot (array) is required.' }, { status: 400 })
  }
  if (snapshot.length > MAX_STROKES) {
    return NextResponse.json({ error: 'Snapshot too large.' }, { status: 413 })
  }

  const wb = await payload.findByID({ collection: 'whiteboards', id: wbId, depth: 0 }).catch(() => null)
  if (!wb) return NextResponse.json({ error: 'Whiteboard not found.' }, { status: 404 })

  // Authorize: admin, the owner, or the tutor of the whiteboard's class.
  let allowed = user.accountType === 'admin' || String(idOf(wb.owner)) === String(user.id)
  if (!allowed && wb.class) {
    const cls = await payload.findByID({ collection: 'classes', id: idOf(wb.class), depth: 0 }).catch(() => null)
    allowed = cls != null && String(idOf(cls.tutor)) === String(user.id)
  }
  if (!allowed) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  try {
    await payload.update({ collection: 'whiteboards', id: wbId, data: { snapshot } as any })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[whiteboards/snapshot] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const runtime = 'nodejs'
import { toIntId } from '@/lib/id'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can update session whiteboard state.' }, { status: 403 })
  }

  const id = toIntId(params.id)
  if (!id) {
    return NextResponse.json({ error: 'Invalid session id.' }, { status: 400 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { showWhiteboard, activeWhiteboard, whiteboardWritable } = body

  try {
    const session = await payload
      .findByID({ collection: 'live-sessions', id, depth: 0 })
      .catch(() => null)
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }
    // Only the session's own tutor may drive its whiteboard state.
    const sessionTutorId =
      typeof session.tutor === 'object' ? (session.tutor as any).id : session.tutor
    if (sessionTutorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    // Partial update: only touch fields the caller explicitly sent, so a
    // writable-only toggle doesn't clobber show/active (and vice-versa).
    const data: Record<string, unknown> = {}
    if (showWhiteboard !== undefined) data.showWhiteboard = !!showWhiteboard
    if (activeWhiteboard !== undefined) data.activeWhiteboard = activeWhiteboard != null ? toIntId(activeWhiteboard) : null
    if (whiteboardWritable !== undefined) data.whiteboardWritable = !!whiteboardWritable

    const updated = await payload.update({ collection: 'live-sessions', id, data: data as any })

    return NextResponse.json({ success: true, session: updated })
  } catch (error: any) {
    console.error('[live-sessions/whiteboard POST] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

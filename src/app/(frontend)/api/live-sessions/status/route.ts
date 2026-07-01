import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { toIntId } from '@/lib/id'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const classId = toIntId(searchParams.get('classId'))

  if (!classId) {
    return NextResponse.json({ error: 'A valid classId is required.' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    // Authorize: only the class tutor, an enrolled student, or a linked parent
    // may learn whether a class is live (and its roomId). Otherwise anyone could
    // enumerate active rooms.
    const cls = await payload.findByID({ collection: 'classes', id: classId, depth: 0 })
    if (!cls) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }
    const tutorId = typeof cls.tutor === 'object' ? (cls.tutor as any).id : cls.tutor
    const studentIds = (cls.students || []).map((s: any) => (typeof s === 'object' ? s.id : s))
    const parentIds = ((cls as any).parents || []).map((p: any) => (typeof p === 'object' ? p.id : p))
    const authorized =
      user.accountType === 'admin' ||
      user.id === tutorId ||
      studentIds.includes(user.id) ||
      parentIds.includes(user.id)
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    // Find active/live session for this class
    const sessions = await payload.find({
      collection: 'live-sessions',
      where: {
        and: [
          { class: { equals: classId } },
          { status: { equals: 'live' } },
        ],
      },
      limit: 1,
      depth: 0,
    })

    if (sessions.docs.length === 0) {
      return NextResponse.json({ status: 'inactive' })
    }

    const session = sessions.docs[0]

    return NextResponse.json({
      status: session.status,
      sessionId: session.id,
      roomId: session.roomId,
      showWhiteboard: session.showWhiteboard || false,
      activeWhiteboard: session.activeWhiteboard || null,
      startedAt: session.startedAt,
    })
  } catch (error: any) {
    console.error('[live-sessions/status] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

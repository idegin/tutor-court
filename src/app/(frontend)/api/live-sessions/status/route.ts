import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('classId')

  if (!classId) {
    return NextResponse.json({ error: 'Missing classId.' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  try {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

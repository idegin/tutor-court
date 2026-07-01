import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateVideoSdkToken, isVideoSdkAvailable } from '@/lib/videosdk'
import { toIntId } from '@/lib/id'

/**
 * Mint a VideoSDK client token scoped to the caller's live class room, with a
 * role derived server-side (tutor => host, everyone else => join-only). The
 * token is bound to the session's roomId so it can't be reused to join another
 * class's room.
 */
export async function POST(request: Request) {
  if (!isVideoSdkAvailable()) {
    return NextResponse.json({ error: 'live_classes_unavailable' }, { status: 503 })
  }

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const classId = toIntId(body?.classId)
  if (!classId) {
    return NextResponse.json({ error: 'A valid classId is required.' }, { status: 400 })
  }

  try {
    const cls = await payload
      .findByID({ collection: 'classes', id: classId, depth: 0 })
      .catch(() => null)
    if (!cls) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const tutorId = typeof cls.tutor === 'object' ? (cls.tutor as any).id : cls.tutor
    const studentIds = (cls.students || []).map((s: any) => (typeof s === 'object' ? s.id : s))
    const parentIds = ((cls as any).parents || []).map((p: any) => (typeof p === 'object' ? p.id : p))

    const isTutor = user.id === tutorId
    const isMember =
      user.accountType === 'admin' ||
      isTutor ||
      studentIds.includes(user.id) ||
      parentIds.includes(user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    // Find the live session so the token can be bound to its room.
    const sessions = await payload.find({
      collection: 'live-sessions',
      where: { and: [{ class: { equals: classId } }, { status: { equals: 'live' } }] },
      limit: 1,
      depth: 0,
    })
    const roomId = sessions.docs[0]?.roomId as string | undefined
    if (!roomId) {
      return NextResponse.json({ error: 'No live session for this class.' }, { status: 409 })
    }

    const token = generateVideoSdkToken(3600 * 2, isTutor ? 'tutor' : 'student', roomId)
    if (!token) {
      return NextResponse.json({ error: 'live_classes_unavailable' }, { status: 503 })
    }

    return NextResponse.json({ token, roomId })
  } catch (error: any) {
    console.error('[live-sessions/token] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

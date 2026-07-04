import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateVideoSdkToken, isVideoSdkAvailable } from '@/lib/videosdk'
import { toIntId } from '@/lib/id'

// How long a freshly minted classroom token stays valid. Minted at the moment
// the participant actually enters the live room (not at page render), so this
// covers even very long classes.
const TOKEN_TTL_SECONDS = 3600 * 6

/**
 * Mint a fresh role-scoped VideoSDK token for a class the caller belongs to.
 *
 * The classroom page also embeds a token at render time, but a student can sit
 * in the waiting room for a long time before the tutor starts the class — by
 * the time they join, that page-load token can be expired or nearly expired,
 * which makes the room join fail with no remote participants and dead mic/cam
 * toggles. The client calls this right before mounting the meeting so the TTL
 * starts counting from the real join.
 */
export async function GET(request: Request) {
  if (!isVideoSdkAvailable()) {
    return NextResponse.json({ error: 'live_classes_unavailable' }, { status: 503 })
  }

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const classId = toIntId(searchParams.get('classId'))
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

    const tutorId = typeof cls.tutor === 'object' && cls.tutor ? (cls.tutor as any).id : cls.tutor
    const studentIds = (cls.students || []).map((s: any) => (typeof s === 'object' ? s.id : s))
    const parentIds = ((cls as any).parents || []).map((p: any) =>
      typeof p === 'object' ? p.id : p,
    )

    const isTutor = user.id === tutorId
    if (!isTutor && !studentIds.includes(user.id) && !parentIds.includes(user.id)) {
      return NextResponse.json({ error: 'You are not enrolled in this class.' }, { status: 403 })
    }

    // Scope the token to the class's CURRENT live room whenever one exists, so
    // a leaked/forwarded token can't be replayed against any other room. The
    // client only calls this once the class is live, so the unscoped fallback
    // is a rare race (e.g. the session ended between poll and fetch).
    const liveSessions = await payload.find({
      collection: 'live-sessions',
      where: {
        and: [{ class: { equals: classId } }, { status: { equals: 'live' } }],
      },
      sort: ['-startedAt', '-id'],
      limit: 1,
      depth: 0,
    })
    const liveRoomId = (liveSessions.docs[0] as any)?.roomId as string | undefined

    const token = generateVideoSdkToken(
      TOKEN_TTL_SECONDS,
      isTutor ? 'tutor' : 'student',
      liveRoomId,
    )
    if (!token) {
      return NextResponse.json({ error: 'live_classes_unavailable' }, { status: 503 })
    }

    return NextResponse.json({ token })
  } catch (error) {
    console.error('[live-sessions/token] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

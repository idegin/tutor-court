import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateVideoSdkToken, isVideoSdkAvailable } from '@/lib/videosdk'
import { CREDIT_RATE } from '@/lib/constants'
import { toIntId } from '@/lib/id'

export async function POST(request: Request) {
  if (!isVideoSdkAvailable()) {
    return NextResponse.json(
      {
        error: 'live_classes_unavailable',
        message:
          "We're working on bringing live classes back online. Please try again in a little while.",
      },
      { status: 503 },
    )
  }

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can start live classes.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const classId = toIntId(body?.classId)
  if (!classId) {
    return NextResponse.json({ error: 'A valid class ID is required.' }, { status: 400 })
  }

  try {
    // Authorization: the caller must be THIS class's tutor. Without this, any
    // tutor could start (and bill against themselves) a session for a class they
    // have no relationship to, and pull another tutor's students into their room.
    const cls = await payload
      .findByID({ collection: 'classes', id: classId, depth: 0 })
      .catch(() => null)
    if (!cls) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }
    const classTutorId = typeof cls.tutor === 'object' ? (cls.tutor as any).id : cls.tutor
    if (classTutorId !== user.id) {
      return NextResponse.json({ error: 'You are not the tutor of this class.' }, { status: 403 })
    }

    // Check tutor credit balance
    const wallets = await payload.find({
      collection: 'wallets',
      where: { user: { equals: user.id } },
      limit: 1,
      depth: 0,
    })

    const wallet = wallets.docs[0]
    if (!wallet || (wallet.creditBalance || 0) < CREDIT_RATE.minimumClassCredits) {
      return NextResponse.json(
        {
          error: `You need at least ${CREDIT_RATE.minimumClassCredits} credits (1 hour) to start a live class.`,
        },
        { status: 400 },
      )
    }

    // Prevent duplicate concurrent sessions for the same class (double-clicks,
    // two open tabs) AND heal any that already exist. There is no DB-level
    // "one live session per class" constraint, so more than one `live` row can
    // exist (a lingering session that was never ended + a fresh start). If the
    // tutor reuses one and a student's page load resolves another, they get
    // different roomIds and end up isolated ("everyone only sees themselves").
    //
    // Canonicalise to the MOST RECENT live session and end the rest, so every
    // reader (page.tsx / status route, which sort the same way) converges on the
    // same room.
    const existingLive = await payload.find({
      collection: 'live-sessions',
      where: {
        and: [{ class: { equals: classId } }, { status: { equals: 'live' } }],
      },
      sort: '-startedAt',
      limit: 100,
      depth: 0,
    })
    if (existingLive.docs.length > 0) {
      const [canonical, ...stale] = existingLive.docs
      // End any duplicate live sessions so only the canonical one remains.
      for (const dup of stale) {
        await payload
          .update({
            collection: 'live-sessions',
            id: dup.id,
            data: { status: 'ended', endedAt: new Date().toISOString() } as any,
          })
          .catch((err) => console.error('[live-sessions/start] failed to end stale session', dup.id, err))
      }
      return NextResponse.json({ session: canonical })
    }

    // Create a real VideoSDK room. We use a fresh server-scoped token for the
    // REST call. If the room can't be created (e.g. VideoSDK is out of credit or
    // unreachable), we must NOT mark a session live — otherwise the tutor would
    // be billed for a class whose media never connects. Surface the failure.
    let roomId: string
    const token = generateVideoSdkToken(3600 * 2, 'server')

    try {
      const videoSdkRes = await fetch('https://api.videosdk.live/v2/rooms', {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
      })
      const videoSdkData = await videoSdkRes.json()
      if (!videoSdkRes.ok || !videoSdkData.roomId) {
        console.error('VideoSDK room creation failed:', videoSdkRes.status, videoSdkData)
        return NextResponse.json(
          {
            error: 'live_classes_unavailable',
            message:
              "We couldn't connect to the live video service. Please try again shortly — you have not been charged.",
          },
          { status: 502 },
        )
      }
      roomId = videoSdkData.roomId
    } catch (err) {
      console.error('Error calling VideoSDK rooms API:', err)
      return NextResponse.json(
        {
          error: 'live_classes_unavailable',
          message:
            "We couldn't connect to the live video service. Please try again shortly — you have not been charged.",
        },
        { status: 502 },
      )
    }

    // Create the session. If a concurrent request won the race and created a
    // live session in the meantime, reuse the most recent one instead of leaving
    // two rooms behind (same deterministic sort as everywhere else).
    let session
    try {
      session = await payload.create({
        collection: 'live-sessions',
        data: {
          class: classId,
          tutor: user.id,
          roomId,
          startedAt: new Date().toISOString(),
          status: 'live',
          attendees: [],
          coinsConsumed: 0,
          durationMinutes: 0,
        } as any,
      })
    } catch (createErr) {
      const raced = await payload.find({
        collection: 'live-sessions',
        where: { and: [{ class: { equals: classId } }, { status: { equals: 'live' } }] },
        sort: '-startedAt',
        limit: 1,
        depth: 0,
      })
      if (raced.docs.length > 0) {
        return NextResponse.json({ session: raced.docs[0] })
      }
      throw createErr
    }

    return NextResponse.json({ session })
  } catch (error: any) {
    console.error('[live-sessions/start] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

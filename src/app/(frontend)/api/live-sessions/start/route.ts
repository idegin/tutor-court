import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateVideoSdkToken, isVideoSdkAvailable } from '@/lib/videosdk'
import { CREDIT_RATE } from '@/lib/constants'
import { toIntId } from '@/lib/id'

// A "live" session can be an orphan: there is no background worker, so if the
// tutor's tab dies without ending the class, the row stays live forever. Any
// live session older than this is treated as abandoned rather than reusable.
const MAX_LIVE_SESSION_AGE_MS = 6 * 60 * 60 * 1000

/**
 * Check that a previously created VideoSDK room is still accepted by the
 * service under the CURRENT credentials. Only a definitive 4xx marks the room
 * invalid; transient failures must not block reusing an otherwise-fine room.
 */
async function isRoomStillValid(roomId: string | null | undefined): Promise<boolean> {
  if (!roomId) return false
  const token = generateVideoSdkToken(300, 'server')
  if (!token) return false
  try {
    const res = await fetch(`https://api.videosdk.live/v2/rooms/validate/${roomId}`, {
      headers: { Authorization: token, 'Content-Type': 'application/json' },
    })
    if (res.ok) {
      // A room can validate but be administratively disabled — that's dead too.
      const data = await res.json().catch(() => ({}))
      return data?.disabled !== true
    }
    if (res.status >= 400 && res.status < 500) return false
    return true
  } catch {
    return true
  }
}

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

    if (cls.status === 'cancelled' || cls.status === 'completed') {
      return NextResponse.json({ error: 'This class is no longer active.' }, { status: 409 })
    }

    // A marketplace (booking-backed) class is paid up-front via escrow, so the
    // tutor does NOT need live-class credits to start it — but only while the
    // booking is actually funded (held). A refunded/unfunded booking is NOT free.
    let isBookingBacked = false
    const bookingId = (cls as any).booking
      ? typeof (cls as any).booking === 'object'
        ? (cls as any).booking.id
        : (cls as any).booking
      : null
    if (bookingId) {
      const bk = await payload
        .findByID({ collection: 'bookings', id: bookingId, depth: 0 })
        .catch(() => null)
      isBookingBacked = (bk as any)?.paymentStatus === 'held'
    }

    // Check tutor credit balance (SaaS classes only).
    const wallets = await payload.find({
      collection: 'wallets',
      where: { user: { equals: user.id } },
      limit: 1,
      depth: 0,
    })

    const wallet = wallets.docs[0]
    if (!isBookingBacked && (!wallet || (wallet.creditBalance || 0) < CREDIT_RATE.minimumClassCredits)) {
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
      sort: ['-startedAt', '-id'],
      limit: 100,
      depth: 0,
    })
    // End an abandoned/duplicate live session AND close its dangling
    // participant/attendance rows, so they can never feed the billing poll
    // (whose duration math would otherwise be computed from an ancient
    // startedAt and drain the wallet the moment the class is reused).
    const endStaleSession = async (doc: any) => {
      const endedIso = new Date().toISOString()
      await payload
        .update({
          collection: 'live-sessions',
          id: doc.id,
          data: { status: 'ended', endedAt: endedIso } as any,
        })
        .catch((err) =>
          console.error('[live-sessions/start] failed to end stale session', doc.id, err),
        )
      try {
        const openLogs = await payload.find({
          collection: 'live-session-participants',
          where: {
            and: [{ liveSession: { equals: doc.id } }, { leftAt: { exists: false } }],
          },
          limit: 1000,
          depth: 0,
        })
        for (const log of openLogs.docs as any[]) {
          const intervalSec = Math.max(
            0,
            Math.floor((Date.now() - new Date(log.joinedAt).getTime()) / 1000),
          )
          await payload.update({
            collection: 'live-session-participants',
            id: log.id,
            data: {
              leftAt: endedIso,
              // Cap the closing interval so an orphan from days ago doesn't
              // record an absurd duration.
              durationSeconds:
                (Number(log.durationSeconds) || 0) +
                Math.min(intervalSec, Math.floor(MAX_LIVE_SESSION_AGE_MS / 1000)),
            } as any,
          })
        }
        const openAttendance = await payload.find({
          collection: 'attendance',
          where: {
            and: [{ liveSession: { equals: doc.id } }, { leftAt: { exists: false } }],
          },
          limit: 1000,
          depth: 0,
        })
        for (const att of openAttendance.docs as any[]) {
          const intervalMin = Math.max(
            0,
            Math.ceil((Date.now() - new Date(att.joinedAt).getTime()) / (1000 * 60)),
          )
          await payload.update({
            collection: 'attendance',
            id: att.id,
            data: {
              leftAt: endedIso,
              durationMinutes:
                (Number(att.durationMinutes) || 0) +
                Math.min(intervalMin, Math.floor(MAX_LIVE_SESSION_AGE_MS / (1000 * 60))),
            } as any,
          })
        }
      } catch (err) {
        console.error('[live-sessions/start] failed to close logs of stale session', doc.id, err)
      }
    }

    if (existingLive.docs.length > 0) {
      const [canonical, ...stale] = existingLive.docs
      // End any duplicate live sessions so only the canonical one remains.
      for (const dup of stale) {
        await endStaleSession(dup)
      }

      // Only reuse the canonical session when it is recent AND its VideoSDK
      // room is still valid. Reusing an orphan hands every participant a dead
      // room — media never connects while chat/whiteboard (our own backend)
      // keep working, which is exactly the "nobody can see or hear anyone"
      // report. Otherwise end it and start fresh below.
      const startedAtMs = new Date(
        (canonical as any).startedAt || (canonical as any).createdAt,
      ).getTime()
      const isFresh =
        Number.isFinite(startedAtMs) && Date.now() - startedAtMs < MAX_LIVE_SESSION_AGE_MS
      if (isFresh && (await isRoomStillValid((canonical as any).roomId))) {
        return NextResponse.json({ session: canonical })
      }
      await endStaleSession(canonical)
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
        sort: ['-startedAt', '-id'],
        limit: 1,
        depth: 0,
      })
      if (raced.docs.length > 0) {
        return NextResponse.json({ session: raced.docs[0] })
      }
      throw createErr
    }

    // Converge after create: the duplicate check above is check-then-create
    // with no DB constraint, so two near-simultaneous starts can BOTH create a
    // session. If that happened, deterministically keep the newest and end the
    // rest — and return the survivor even if it isn't the one this request
    // created, so both racing tabs (and every student poll) land in the SAME
    // room instead of the class splitting across two.
    const postCreate = await payload.find({
      collection: 'live-sessions',
      where: { and: [{ class: { equals: classId } }, { status: { equals: 'live' } }] },
      sort: ['-startedAt', '-id'],
      limit: 10,
      depth: 0,
    })
    if (postCreate.docs.length > 1) {
      const ranked = [...postCreate.docs].sort((a: any, b: any) => {
        const at = new Date(a.startedAt || a.createdAt).getTime()
        const bt = new Date(b.startedAt || b.createdAt).getTime()
        if (bt !== at) return bt - at
        return Number(b.id) - Number(a.id)
      })
      const winner = ranked[0]
      for (const dup of ranked.slice(1)) {
        await endStaleSession(dup)
      }
      return NextResponse.json({ session: winner })
    }

    return NextResponse.json({ session })
  } catch (error: any) {
    console.error('[live-sessions/start] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

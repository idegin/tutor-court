import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateVideoSdkToken, isVideoSdkAvailable } from '@/lib/videosdk'
import { CREDIT_RATE } from '@/lib/constants'

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

  const { classId } = body
  if (!classId) {
    return NextResponse.json({ error: 'Class ID is required.' }, { status: 400 })
  }

  try {
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

    // Try to call VideoSDK to create a room if configured
    let roomId = `room-${classId}-${Date.now()}`
    const token = generateVideoSdkToken()

    if (token) {
      try {
        const videoSdkRes = await fetch('https://api.videosdk.live/v2/rooms', {
          method: 'POST',
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
        })
        const videoSdkData = await videoSdkRes.json()
        if (videoSdkData.roomId) {
          roomId = videoSdkData.roomId
        }
      } catch (err) {
        console.error('Error calling VideoSDK rooms API:', err)
      }
    }

    const session = await payload.create({
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

    return NextResponse.json({ session })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

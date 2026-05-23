import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: Request) {
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
    // Check tutor coin balance
    const wallets = await payload.find({
      collection: 'wallets',
      where: { user: { equals: user.id } },
      limit: 1,
      depth: 0,
    })

    const wallet = wallets.docs[0]
    if (!wallet || (wallet.coinBalance || 0) < 60) {
      return NextResponse.json(
        { error: 'You need at least 60 coins (1 hour) to start a live class.' },
        { status: 400 },
      )
    }

    // Try to call VideoSDK to create a room if configured
    let roomId = `room-${classId}-${Date.now()}`
    const token = process.env.NEXT_PUBLIC_VIDEOSDK_TOKEN

    if (token && token !== 'videosdk_token_placeholder') {
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

import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: Request) {
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

  const { sessionId } = body
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 })
  }

  try {
    const now = new Date()

    // 1. Update the live-session-participants record
    const participantLogs = await payload.find({
      collection: 'live-session-participants',
      where: {
        and: [
          { liveSession: { equals: sessionId } },
          { user: { equals: user.id } },
        ],
      },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
    })

    const latestLog = participantLogs.docs[0] as any
    if (latestLog && !latestLog.leftAt) {
      const joinedTime = new Date(latestLog.joinedAt).getTime()
      const leftTime = now.getTime()
      const durationSeconds = Math.max(0, Math.floor((leftTime - joinedTime) / 1000))

      await payload.update({
        collection: 'live-session-participants',
        id: latestLog.id,
        data: {
          leftAt: now.toISOString(),
          durationSeconds,
        } as any,
      })
    }

    // 2. If the user is a student, also update their student Attendance record
    if (user.accountType === 'student') {
      const attendanceRecords = await payload.find({
        collection: 'attendance',
        where: {
          and: [
            { liveSession: { equals: sessionId } },
            { student: { equals: user.id } },
          ],
        },
        sort: '-createdAt',
        limit: 1,
        depth: 0,
      })

      const latestAttendance = attendanceRecords.docs[0] as any
      if (latestAttendance && !latestAttendance.leftAt) {
        const joinedTime = new Date(latestAttendance.joinedAt).getTime()
        const leftTime = now.getTime()
        const durationMinutes = Math.max(1, Math.ceil((leftTime - joinedTime) / (1000 * 60)))

        await payload.update({
          collection: 'attendance',
          id: latestAttendance.id,
          data: {
            leftAt: now.toISOString(),
            durationMinutes,
          } as any,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { createActivityLogs } from '@/lib/activity-log-service'

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

    const participantLogs = await payload.find({
      collection: 'live-session-participants',
      where: {
        and: [{ liveSession: { equals: sessionId } }, { user: { equals: user.id } }],
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

    if (user.accountType === 'student') {
      const attendanceRecords = await payload.find({
        collection: 'attendance',
        where: {
          and: [{ liveSession: { equals: sessionId } }, { student: { equals: user.id } }],
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

      // Activity log: only meaningful for students, since the tutor leaving
      // is implicit in "class_ended".
      try {
        const session = await payload.findByID({
          collection: 'live-sessions',
          id: sessionId,
          depth: 0,
        })
        const classIdVal =
          typeof session.class === 'object' ? (session.class as any).id : session.class
        const tutorIdVal =
          typeof session.tutor === 'object' ? (session.tutor as any).id : session.tutor
        const cls = await payload.findByID({
          collection: 'classes',
          id: classIdVal,
          depth: 0,
        })
        const className = (cls as any)?.title || 'the class'
        const studentName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        const durationSeconds = latestLog?.joinedAt
          ? Math.max(0, Math.floor((now.getTime() - new Date(latestLog.joinedAt).getTime()) / 1000))
          : 0
        const durationMin = Math.round(durationSeconds / 60)

        await createActivityLogs([
          {
            subjectId: user.id,
            actorId: user.id,
            type: 'class_left',
            title: `Left ${className}`,
            description: `Spent ${durationMin} minute${durationMin === 1 ? '' : 's'} in the session.`,
            link: `/dashboard/student/classes/${classIdVal}`,
            relatedCollection: 'live-sessions',
            relatedId: String(sessionId),
            metadata: { durationSeconds, classId: classIdVal },
          },
          {
            subjectId: tutorIdVal,
            actorId: user.id,
            type: 'class_left',
            title: `${studentName} left ${className}`,
            description: `Stayed for ${durationMin} minute${durationMin === 1 ? '' : 's'}.`,
            link: `/dashboard/tutor/classes/${classIdVal}`,
            relatedCollection: 'live-sessions',
            relatedId: String(sessionId),
            metadata: { durationSeconds, classId: classIdVal, studentId: user.id },
          },
        ])
      } catch (logErr) {
        console.error('[live-sessions/leave] Failed to write activity logs:', logErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { createActivityLogs } from '@/lib/activity-log-service'
import { toIntId } from '@/lib/id'

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

  const sessionId = toIntId(body?.sessionId)
  if (!sessionId) {
    return NextResponse.json({ error: 'A valid sessionId is required.' }, { status: 400 })
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
      const intervalSeconds = Math.max(0, Math.floor((leftTime - joinedTime) / 1000))

      await payload.update({
        collection: 'live-session-participants',
        id: latestLog.id,
        data: {
          leftAt: now.toISOString(),
          // joinedAt resets on every rejoin; earlier intervals are already
          // accumulated in durationSeconds, so add rather than overwrite.
          durationSeconds: (Number(latestLog.durationSeconds) || 0) + intervalSeconds,
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
        // No 1-minute floor here: intervals ACCUMULATE across rejoins, and a
        // floored interval per reconnect would inflate a flaky connection into
        // phantom minutes.
        const intervalMinutes = Math.max(0, Math.ceil((leftTime - joinedTime) / (1000 * 60)))

        await payload.update({
          collection: 'attendance',
          id: latestAttendance.id,
          data: {
            leftAt: now.toISOString(),
            durationMinutes: (Number(latestAttendance.durationMinutes) || 0) + intervalMinutes,
          } as any,
        })
      }

      // Activity log: only meaningful when the student actually had an active
      // participation record. Skip it for a "leave" with no matching join so we
      // don't write a bogus "0 minutes" entry.
      if (latestLog) try {
        const session = await payload
          .findByID({ collection: 'live-sessions', id: sessionId, depth: 0 })
          .catch(() => null)
        if (!session) throw new Error('Session not found for activity log.')
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
    console.error('[live-sessions/leave] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

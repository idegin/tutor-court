import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { createNotification } from '@/lib/notification-service'
import { createActivityLogs } from '@/lib/activity-log-service'
import { isVideoSdkAvailable } from '@/lib/videosdk'

const LATE_THRESHOLD_MINUTES = 5

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

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { classId, sessionId } = body
  if (!classId || !sessionId) {
    return NextResponse.json({ error: 'Missing classId or sessionId.' }, { status: 400 })
  }

  try {
    const session = await payload.findByID({
      collection: 'live-sessions',
      id: sessionId,
      depth: 1,
    })

    if (!session) {
      return NextResponse.json({ error: 'Live session not found.' }, { status: 404 })
    }

    if (session.status !== 'live') {
      return NextResponse.json(
        { error: 'This live session has already ended.' },
        { status: 409 },
      )
    }

    const classIdVal = typeof session.class === 'object' ? session.class.id : session.class
    const tutorIdVal = typeof session.tutor === 'object' ? session.tutor.id : session.tutor

    // Authorization Check: only class tutor or enrolled students can join
    const cls = await payload.findByID({
      collection: 'classes',
      id: classIdVal,
      depth: 0,
    })

    if (!cls) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const classTutorId = typeof cls.tutor === 'object' ? (cls.tutor as any).id : cls.tutor
    const studentIds = cls.students ? cls.students.map((s: any) => typeof s === 'object' ? s.id : s) : []

    if (user.id !== classTutorId && !studentIds.includes(user.id)) {
      return NextResponse.json({ error: 'You are not enrolled in this class.' }, { status: 403 })
    }

    const currentAttendees = session.attendees
      ? session.attendees.map((a: any) => (typeof a === 'object' ? a.id : a))
      : []

    if (!currentAttendees.includes(user.id)) {
      await payload.update({
        collection: 'live-sessions',
        id: sessionId,
        data: {
          attendees: [...currentAttendees, user.id],
        } as any,
      })
    }

    const existingLog = await payload.find({
      collection: 'live-session-participants',
      where: {
        and: [{ liveSession: { equals: sessionId } }, { user: { equals: user.id } }],
      },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
    })

    const latestLog = existingLog.docs[0] as any
    if (!latestLog || latestLog.leftAt) {
      await payload.create({
        collection: 'live-session-participants',
        data: {
          liveSession: sessionId,
          class: classIdVal,
          user: user.id,
          accountType: user.accountType,
          joinedAt: new Date().toISOString(),
        } as any,
      })
    }

    const sessionStartedAt = session.startedAt ? new Date(session.startedAt).getTime() : null
    const joinedAt = new Date()
    const latenessMinutes = sessionStartedAt
      ? Math.max(0, Math.floor((joinedAt.getTime() - sessionStartedAt) / (1000 * 60)))
      : 0

    if (user.accountType === 'student') {
      const studentUser = await payload.findByID({
        collection: 'users',
        id: user.id,
        depth: 0,
      })

      const parentId = studentUser.parent

      const existingAttendance = await payload.find({
        collection: 'attendance',
        where: {
          and: [{ liveSession: { equals: sessionId } }, { student: { equals: user.id } }],
        },
        limit: 1,
        depth: 0,
      })

      if (existingAttendance.docs.length === 0) {
        await payload.create({
          collection: 'attendance',
          data: {
            liveSession: sessionId,
            class: classIdVal,
            student: user.id,
            parent: parentId || undefined,
            tutor: tutorIdVal,
            joinedAt: joinedAt.toISOString(),
            latenessMinutes,
            status: latenessMinutes > LATE_THRESHOLD_MINUTES ? 'late' : 'present',
            engagementFlag: 'unknown',
          } as any,
        })
      }
    }

    if (user.accountType === 'student' || user.accountType === 'parent') {
      const cls = await payload.findByID({
        collection: 'classes',
        id: classIdVal,
        depth: 0,
      })

      const studentName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      const className = (cls as any)?.title || 'the class'
      const notifType =
        user.accountType === 'student' ? 'student_joined_class' : 'student_added_to_class'

      createNotification({
        recipientId: String(tutorIdVal),
        type: notifType,
        title: user.accountType === 'student' ? 'Student Joined Live Class' : 'Parent Joined Live Class',
        message: `${studentName} has joined "${className}" live session.`,
        link: `/dashboard/tutor/classes/${classIdVal}`,
        relatedCollection: 'classes',
        relatedId: String(classIdVal),
      }).catch(() => {})

      // Activity log on both perspectives so the parent (via subject = childId)
      // and the tutor (via subject = self) both see the event.
      if (user.accountType === 'student') {
        createActivityLogs([
          {
            subjectId: user.id,
            actorId: user.id,
            type: 'class_joined',
            title: `Joined ${className}`,
            description: latenessMinutes > LATE_THRESHOLD_MINUTES
              ? `Joined ${latenessMinutes} minutes late.`
              : 'Joined on time.',
            link: `/dashboard/student/classes/${classIdVal}`,
            relatedCollection: 'live-sessions',
            relatedId: String(sessionId),
            metadata: { latenessMinutes, classId: classIdVal },
          },
          {
            subjectId: tutorIdVal,
            actorId: user.id,
            type: 'class_joined',
            title: `${studentName} joined ${className}`,
            description: latenessMinutes > LATE_THRESHOLD_MINUTES
              ? `${studentName} joined ${latenessMinutes} minutes late.`
              : `${studentName} joined on time.`,
            link: `/dashboard/tutor/classes/${classIdVal}`,
            relatedCollection: 'live-sessions',
            relatedId: String(sessionId),
            metadata: { latenessMinutes, classId: classIdVal, studentId: user.id },
          },
        ]).catch(() => {})
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

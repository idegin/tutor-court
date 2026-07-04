import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { createNotification } from '@/lib/notification-service'
import { createActivityLogs } from '@/lib/activity-log-service'
import { isVideoSdkAvailable } from '@/lib/videosdk'
import { toIntId } from '@/lib/id'

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

  const sessionId = toIntId(body?.sessionId)
  if (!body?.classId || !sessionId) {
    return NextResponse.json({ error: 'A valid classId and sessionId are required.' }, { status: 400 })
  }

  try {
    const session = await payload
      .findByID({ collection: 'live-sessions', id: sessionId, depth: 1 })
      .catch(() => null)

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

    // Authorization Check: only the class tutor, an enrolled student, or a
    // linked parent can join. (Parents are tracked/billed elsewhere in the
    // lifecycle, so they must be allowed through here too.)
    const cls = await payload
      .findByID({ collection: 'classes', id: classIdVal, depth: 0 })
      .catch(() => null)

    if (!cls) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const classTutorId = typeof cls.tutor === 'object' ? (cls.tutor as any).id : cls.tutor
    const studentIds = cls.students ? cls.students.map((s: any) => typeof s === 'object' ? s.id : s) : []
    const parentIds = ((cls as any).parents || []).map((p: any) => (typeof p === 'object' ? p.id : p))

    if (
      user.id !== classTutorId &&
      !studentIds.includes(user.id) &&
      !parentIds.includes(user.id)
    ) {
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

    // Idempotent participation: the collection enforces one record per user per
    // session (a beforeChange hook throws on a duplicate create). So create only
    // when none exists, reopen the existing one on rejoin, and no-op if already
    // active — otherwise a refresh/reconnect would 500.
    const latestLog = existingLog.docs[0] as any
    if (!latestLog) {
      try {
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
      } catch (err: any) {
        // Lost a create race with a concurrent join — treat as already joined.
        if (!String(err?.message || '').includes('already exists')) throw err
      }
    } else if (latestLog.leftAt) {
      await payload.update({
        collection: 'live-session-participants',
        id: latestLog.id,
        data: { leftAt: null, joinedAt: new Date().toISOString() } as any,
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
      } else if ((existingAttendance.docs[0] as any).leftAt) {
        // Rejoin: reopen the attendance record for a new interval. Minutes from
        // the earlier interval are already accumulated in durationMinutes and
        // every closer ADDS the new interval, so nothing is lost.
        await payload.update({
          collection: 'attendance',
          id: (existingAttendance.docs[0] as any).id,
          data: { leftAt: null, joinedAt: joinedAt.toISOString() } as any,
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

      createNotification({
        recipientId: String(tutorIdVal),
        // Someone joined the LIVE session — 'student_added_to_class' is the
        // enrollment event and was the wrong type for a parent joining.
        type: 'student_joined_class',
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
    console.error('[live-sessions/join] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

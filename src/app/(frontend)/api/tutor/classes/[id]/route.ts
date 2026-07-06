import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  const { id } = await params

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can edit classes.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const {
    subject,
    description,
    classType,
    maxStudents,
    startDate,
    endDate,
    schedule,
  } = body

  if (!subject || !startDate || !endDate || !schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return NextResponse.json({ error: 'Missing required class fields.' }, { status: 400 })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid start or end date.' }, { status: 400 })
  }
  if (end <= start) {
    return NextResponse.json({ error: 'End date must be after the start date.' }, { status: 400 })
  }

  try {
    // Check if class belongs to this tutor
    const existingClass = await payload.findByID({
      collection: 'classes',
      id,
      depth: 0,
    })

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const tutorId = typeof existingClass.tutor === 'object' ? (existingClass.tutor as any).id : existingClass.tutor
    if (tutorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this class.' }, { status: 403 })
    }

    // Update class
    const updatedClass = await payload.update({
      collection: 'classes',
      id,
      data: {
        subject: Number(subject),
        description,
        classType: classType || 'one-on-one',
        maxStudents: classType === 'group' ? Number(maxStudents) : 1,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        schedule: schedule.map((s: any) => ({
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      } as any,
      overrideAccess: true,
    })

    return NextResponse.json({ success: true, class: updatedClass })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  const { id } = await params

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can delete classes.' }, { status: 403 })
  }

  try {
    // Check if class belongs to this tutor
    const existingClass = await payload.findByID({
      collection: 'classes',
      id,
      depth: 0,
    })

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const tutorId = typeof existingClass.tutor === 'object' ? (existingClass.tutor as any).id : existingClass.tutor
    if (tutorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this class.' }, { status: 403 })
    }

    // Guard against deleting a class with an active live session
    const activeSessions = await payload.find({
      collection: 'live-sessions',
      where: {
        and: [
          { class: { equals: id } },
          { status: { in: ['waiting', 'live'] } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (activeSessions.totalDocs > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a class with an active live session.' },
        { status: 409 },
      )
    }

    // A marketplace class the student PAID for can't be deleted (that would
    // strand the held escrow). The booking must be cancelled/refunded first.
    if ((existingClass as any).booking) {
      const bkId =
        typeof (existingClass as any).booking === 'object'
          ? (existingClass as any).booking.id
          : (existingClass as any).booking
      const bk = await payload.findByID({ collection: 'bookings', id: bkId, depth: 0 }).catch(() => null)
      if ((bk as any)?.paymentStatus === 'held') {
        return NextResponse.json(
          { error: 'This class was paid for via a booking. Cancel the booking (which refunds it) instead.' },
          { status: 409 },
        )
      }
    }

    // Helper: run a delete but never let one failing/empty delete abort the
    // whole cascade — log and continue.
    const safeDelete = async (fn: () => Promise<any>, label: string) => {
      try {
        await fn()
      } catch (err: any) {
        console.error(`[class DELETE cascade] ${label} failed:`, err?.message || err)
      }
    }

    // 1. assessment-results -> tutor-assessments (results reference tutorAssessment,
    //    not class, so resolve the class's tutor-assessment ids first).
    const tutorAssessments = await payload.find({
      collection: 'tutor-assessments',
      where: { class: { equals: id } },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })
    const tutorAssessmentIds = tutorAssessments.docs.map((d: any) => d.id)
    if (tutorAssessmentIds.length > 0) {
      await safeDelete(
        () =>
          payload.delete({
            collection: 'assessment-results',
            where: { tutorAssessment: { in: tutorAssessmentIds } },
            overrideAccess: true,
          }),
        'assessment-results',
      )
    }
    await safeDelete(
      () =>
        payload.delete({
          collection: 'tutor-assessments',
          where: { class: { equals: id } },
          overrideAccess: true,
        }),
      'tutor-assessments',
    )

    // 2. whiteboard-slides -> whiteboards (slides reference whiteboard, not class).
    const whiteboards = await payload.find({
      collection: 'whiteboards',
      where: { class: { equals: id } },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })
    const whiteboardIds = whiteboards.docs.map((d: any) => d.id)
    if (whiteboardIds.length > 0) {
      await safeDelete(
        () =>
          payload.delete({
            collection: 'whiteboard-slides',
            where: { whiteboard: { in: whiteboardIds } },
            overrideAccess: true,
          }),
        'whiteboard-slides',
      )
    }
    await safeDelete(
      () =>
        payload.delete({
          collection: 'whiteboards',
          where: { class: { equals: id } },
          overrideAccess: true,
        }),
      'whiteboards',
    )

    // 3. attendance (has a direct class field).
    await safeDelete(
      () =>
        payload.delete({
          collection: 'attendance',
          where: { class: { equals: id } },
          overrideAccess: true,
        }),
      'attendance',
    )

    // 4. live-session-participants (has a class field) and live-session-messages
    //    (no class field — reference liveSession only, so resolve session ids).
    await safeDelete(
      () =>
        payload.delete({
          collection: 'live-session-participants',
          where: { class: { equals: id } },
          overrideAccess: true,
        }),
      'live-session-participants',
    )
    const liveSessions = await payload.find({
      collection: 'live-sessions',
      where: { class: { equals: id } },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })
    const liveSessionIds = liveSessions.docs.map((d: any) => d.id)
    if (liveSessionIds.length > 0) {
      await safeDelete(
        () =>
          payload.delete({
            collection: 'live-session-messages',
            where: { liveSession: { in: liveSessionIds } },
            overrideAccess: true,
          }),
        'live-session-messages',
      )
    }
    await safeDelete(
      () =>
        payload.delete({
          collection: 'live-sessions',
          where: { class: { equals: id } },
          overrideAccess: true,
        }),
      'live-sessions',
    )

    // 5. Cascade cleanup: remove pending invitations for this class
    await safeDelete(
      () =>
        payload.delete({
          collection: 'class-invitations',
          where: { class: { equals: id } },
          overrideAccess: true,
        }),
      'class-invitations',
    )

    // 6. Finally delete the class itself.
    await payload.delete({
      collection: 'classes',
      id,
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

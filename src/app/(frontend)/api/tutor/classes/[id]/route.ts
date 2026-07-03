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
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
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
    const existingClass = await payload.findByID({ collection: 'classes', id, depth: 0 })
    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const tutorId =
      typeof existingClass.tutor === 'object' ? (existingClass.tutor as any).id : existingClass.tutor
    if (tutorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this class.' }, { status: 403 })
    }

    // Never delete a class that is mid-session — the tutor must end it first,
    // otherwise participants would be left in an orphaned live room.
    const activeSessions = await payload.find({
      collection: 'live-sessions',
      where: {
        and: [{ class: { equals: id } }, { status: { in: ['live', 'waiting'] } }],
      },
      limit: 1,
      depth: 0,
    })
    if (activeSessions.totalDocs > 0) {
      return NextResponse.json({ error: 'End the live class before deleting it.' }, { status: 409 })
    }

    // Remove pending invitations for this class: they carry unique tokens and
    // are meaningless once the class is gone. Other related rows (past sessions,
    // attendance, reviews) have ON DELETE SET NULL foreign keys, so they remain
    // as history without blocking the delete.
    await payload
      .delete({ collection: 'class-invitations', where: { class: { equals: id } } })
      .catch((err) => console.error('[classes/delete] invitation cleanup failed:', err))

    await payload.delete({ collection: 'classes', id, overrideAccess: true })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[classes/delete] error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete class.' }, { status: 500 })
  }
}

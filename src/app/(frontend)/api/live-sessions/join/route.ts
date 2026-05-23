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

  const { classId, sessionId } = body
  if (!classId || !sessionId) {
    return NextResponse.json({ error: 'Missing classId or sessionId.' }, { status: 400 })
  }

  try {
    // 1. Fetch live session
    const session = await payload.findByID({
      collection: 'live-sessions',
      id: sessionId,
      depth: 1,
    })

    if (!session) {
      return NextResponse.json({ error: 'Live session not found.' }, { status: 404 })
    }

    const classIdVal = typeof session.class === 'object' ? session.class.id : session.class
    const tutorIdVal = typeof session.tutor === 'object' ? session.tutor.id : session.tutor

    // 2. Add user to session attendees if not already present
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

    // 3. If joining user is a student, create/update an Attendance record linking student and parent
    if (user.accountType === 'student') {
      // Find parent from student user profile
      const studentUser = await payload.findByID({
        collection: 'users',
        id: user.id,
        depth: 0,
      })

      const parentId = studentUser.parent

      // Check if attendance already exists
      const existingAttendance = await payload.find({
        collection: 'attendance',
        where: {
          and: [
            { liveSession: { equals: sessionId } },
            { student: { equals: user.id } },
          ],
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
            joinedAt: new Date().toISOString(),
            status: 'present',
          } as any,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getRouteUser } from '@/lib/auth'
import { sessionExpiredResponse } from '@/lib/auth-response'
import crypto from 'crypto'
import { getBaseEmailLayout } from '@/lib/email-template'

export async function POST(request: Request) {
  const { user, payload } = await getRouteUser()

  if (!user) {
    return sessionExpiredResponse()
  }
  if (user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can create classes.' }, { status: 403 })
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

  // Dates arrive as YYYY-MM-DD local strings from the client — compare as
  // strings to avoid UTC-offset false-positives for tutors in UTC+ timezones.
  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRe.test(startDate) || !dateRe.test(endDate)) {
    return NextResponse.json({ error: 'Invalid start or end date.' }, { status: 400 })
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'End date cannot be before the start date.' }, { status: 400 })
  }
  const todayStr = new Date().toISOString().split('T')[0]
  if (startDate < todayStr) {
    return NextResponse.json({ error: 'Start date cannot be in the past.' }, { status: 400 })
  }

  // Parse to ISO for Payload storage (UTC noon avoids any DST/date edge)
  const start = new Date(startDate + 'T12:00:00.000Z')
  const end = new Date(endDate + 'T12:00:00.000Z')

  try {
    // Create class
    const newClass = await payload.create({
      collection: 'classes',
      data: {
        tutor: user.id,
        subject: Number(subject),
        description,
        classType: classType || 'one-on-one',
        maxStudents: maxStudents ? Number(maxStudents) : 1,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        schedule: schedule.map((s: any) => ({
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        status: 'scheduled',
        students: [],
        parents: [],
      } as any,
      overrideAccess: true,
    })

    return NextResponse.json({ success: true, classId: newClass.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

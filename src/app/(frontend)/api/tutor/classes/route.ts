import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'
import { getBaseEmailLayout } from '@/lib/email-template'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
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
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
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

import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'
import { z } from 'zod'
import { getBaseEmailLayout, getEmailServerUrl } from '@/lib/email-template'
import { sendEmail } from '@/lib/email-service'
import { createNotification } from '@/lib/notification-service'
import { computeBookingPrice } from '@/lib/booking-pricing'

const bookingSchema = z.object({
  tutorId: z.string(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid startDate' }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid endDate' }),
  hoursPerDay: z.number().min(1).max(10),
  daysOfWeek: z.array(z.string()).min(1),
  // subjects may arrive as subject IDs or names; resolved to IDs server-side.
  subjects: z.array(z.string()).min(1),
  message: z.string().optional(),
  // When a parent books on behalf of a managed student, the child's user id.
  studentId: z.string().optional(),
})

type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export async function POST(req: Request) {
  try {
    const { user } = await getServerSideUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.accountType !== 'student' && user.accountType !== 'parent') {
      return NextResponse.json(
        { error: 'Only students or parents can request a booking.' },
        { status: 403 },
      )
    }

    const body = await req.json()
    const parsed = bookingSchema.parse(body)

    const payload = await getPayload({ config })

    const tutorProfile = await payload.findByID({
      collection: 'tutor-profiles',
      id: parsed.tutorId,
      depth: 1,
      overrideAccess: true,
    })

    if (!tutorProfile) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    // Resolve who the booking is FOR (student) and who is paying (parent).
    let studentId: string | number = user.id
    let parentId: string | number | null = null

    if (user.accountType === 'parent') {
      const childrenRes = await payload.find({
        collection: 'users',
        where: {
          and: [{ parent: { equals: user.id } }, { accountType: { equals: 'student' } }],
        },
        limit: 200,
        depth: 0,
        overrideAccess: true,
      })
      const childIds = childrenRes.docs.map((d: any) => String(d.id))
      if (childIds.length === 0) {
        return NextResponse.json(
          { error: 'Add a child to your account before booking a tutor.' },
          { status: 400 },
        )
      }
      if (parsed.studentId) {
        if (!childIds.includes(String(parsed.studentId))) {
          return NextResponse.json({ error: 'That student is not on your account.' }, { status: 403 })
        }
        studentId = parsed.studentId
      } else if (childIds.length === 1) {
        studentId = childIds[0]
      } else {
        return NextResponse.json(
          { error: 'Select which child this booking is for.' },
          { status: 400 },
        )
      }
      parentId = user.id
    }

    // Coerce numeric-string ids to numbers so the Postgres relationship
    // validates (a stringified id fails the FK check).
    const numericId = (v: string | number): string | number =>
      typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v
    studentId = numericId(studentId)

    // Authoritative pricing — the server is the source of truth.
    const price = computeBookingPrice({
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      daysOfWeek: parsed.daysOfWeek,
      hoursPerDay: parsed.hoursPerDay,
      hourlyRate: tutorProfile.hourlyRate || 0,
    })

    const start = new Date(parsed.startDate)
    const end = new Date(parsed.endDate)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    if (start < startOfToday) {
      return NextResponse.json({ error: 'Start date cannot be in the past.' }, { status: 400 })
    }
    if (!price.valid) {
      return NextResponse.json(
        {
          error:
            price.hourlyRate <= 0
              ? 'This tutor has not set an hourly rate yet.'
              : 'The selected dates and days do not include any sessions.',
        },
        { status: 400 },
      )
    }

    // Resolve incoming subjects (IDs or names) to Subject IDs (+ names for emails).
    const subjectIds: (string | number)[] = []
    const subjectNames: string[] = []
    for (const raw of parsed.subjects) {
      const trimmed = raw.trim()
      if (!trimmed) continue
      const match = await payload.find({
        collection: 'subjects',
        where: {
          or: [
            { id: { equals: trimmed } },
            { slug: { equals: trimmed.toLowerCase() } },
            { name: { equals: trimmed } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (match.docs[0]) {
        subjectIds.push(match.docs[0].id)
        subjectNames.push((match.docs[0] as any).name || trimmed)
      }
    }
    if (subjectIds.length === 0) {
      return NextResponse.json({ error: 'No valid subjects supplied' }, { status: 400 })
    }

    const booking = await payload.create({
      collection: 'bookings',
      data: {
        student: studentId,
        ...(parentId ? { parent: parentId } : {}),
        tutor: tutorProfile.id,
        date: start.toISOString(),
        endDate: end.toISOString(),
        hoursPerDay: parsed.hoursPerDay,
        daysOfWeek: parsed.daysOfWeek as DayOfWeek[],
        subjects: subjectIds as any,
        message: parsed.message || '',
        price: price.totalPrice,
        currency: 'ngn',
        status: 'pending',
        paymentStatus: 'unpaid',
      },
      overrideAccess: true,
    } as any)

    // Resolve the tutor's user (for notifications).
    let tutorUserId: string | number | null = null
    let tutorEmail = ''
    if (typeof tutorProfile.user === 'object' && tutorProfile.user) {
      tutorUserId = (tutorProfile.user as any).id
      tutorEmail = (tutorProfile.user as any).email || ''
    } else if (tutorProfile.user) {
      tutorUserId = tutorProfile.user as any
      const tutorUser = await payload.findByID({
        collection: 'users',
        id: tutorProfile.user as any,
        overrideAccess: true,
      })
      tutorEmail = tutorUser?.email || ''
    }

    const bookerName = `${user.firstName} ${user.lastName}`.trim()

    // In-app notification for the tutor.
    if (tutorUserId) {
      await createNotification({
        recipientId: String(tutorUserId),
        type: 'new_booking',
        title: 'New booking request',
        message: `${bookerName} requested ${subjectNames.join(', ')} — ${price.sessions} session${
          price.sessions === 1 ? '' : 's'
        }, ${price.hoursPerDay}h each.`,
        link: '/dashboard/tutor/bookings',
        relatedCollection: 'bookings',
        relatedId: String(booking.id),
      })
    }

    // Email the tutor.
    if (tutorEmail) {
      const headers = await getHeaders()
      const serverUrl = getEmailServerUrl(headers)
      const htmlContent = `
        <p class="text">Hi there,</p>
        <p class="text">You have received a new booking request from ${bookerName}.</p>
        <p class="text">${subjectNames.join(', ')} — ${price.sessions} session${
          price.sessions === 1 ? '' : 's'
        } (${parsed.hoursPerDay} hour${parsed.hoursPerDay === 1 ? '' : 's'} per session).</p>
        ${parsed.message ? `<p class="text">Message: "${parsed.message}"</p>` : ''}
        <div class="btn-container">
          <a href="${serverUrl}/dashboard/tutor/bookings" class="btn">Review Request</a>
        </div>
      `
      await sendEmail({
        to: tutorEmail,
        subject: 'New Booking Request - TutorCourt',
        html: getBaseEmailLayout('New Booking Request', htmlContent, serverUrl),
      }).catch((e) => console.error('[bookings] failed to email tutor:', e?.message))
    }

    return NextResponse.json({ success: true, booking, price })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid booking details.', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: error?.message || 'Error creating booking' }, { status: 500 })
  }
}

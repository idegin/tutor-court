import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'

const idOf = (rel: any): string | null =>
  rel == null ? null : String(typeof rel === 'object' ? rel.id : rel)

const numericId = (v: any): string | number =>
  typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v

/**
 * POST /api/private/reviews — a booker leaves a review for a COMPLETED booking.
 * One review per booking. Reviews from a completed (verified, paid) engagement
 * are auto-approved so they count toward the tutor's public rating.
 */
export async function POST(request: Request) {
  const { user } = await getServerSideUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const bookingId = body?.bookingId
  const rating = Number(body?.rating)
  const reviewText = typeof body?.review === 'string' ? body.review.trim() : ''

  if (!bookingId) return NextResponse.json({ error: 'bookingId is required.' }, { status: 400 })
  if (!(rating >= 1 && rating <= 5)) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 })
  }
  if (reviewText.length < 10) {
    return NextResponse.json({ error: 'Please write at least 10 characters.' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  let booking: any
  try {
    booking = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 1, overrideAccess: true })
  } catch {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

  const isBooker =
    idOf(booking.student) === String(user.id) || idOf(booking.parent) === String(user.id)
  if (!isBooker) {
    return NextResponse.json({ error: 'You can only review your own bookings.' }, { status: 403 })
  }
  if (booking.status !== 'completed') {
    return NextResponse.json({ error: 'You can only review a completed engagement.' }, { status: 409 })
  }

  // One review per booking.
  const dup = await payload.find({
    collection: 'reviews',
    where: { booking: { equals: bookingId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (dup.totalDocs > 0) {
    return NextResponse.json({ error: 'You have already reviewed this booking.' }, { status: 409 })
  }

  const tutorProfileId = idOf(booking.tutor)
  const classId = idOf(booking.class)

  const created = await payload.create({
    collection: 'reviews',
    data: {
      review: reviewText,
      rating,
      user: numericId(user.id),
      tutor: tutorProfileId ? numericId(tutorProfileId) : undefined,
      booking: numericId(bookingId),
      ...(classId ? { class: numericId(classId) } : {}),
      // Verified (completed, paid) engagement → auto-approved.
      isApproved: true,
    } as any,
    overrideAccess: true,
  })

  return NextResponse.json({ success: true, review: created })
}

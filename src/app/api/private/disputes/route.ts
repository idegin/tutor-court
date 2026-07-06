import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'
import { createNotification } from '@/lib/notification-service'

const idOf = (rel: any): string | null =>
  rel == null ? null : String(typeof rel === 'object' ? rel.id : rel)

const numericId = (v: any): string | number =>
  typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v

const REASONS = ['no_show', 'quality', 'scheduling', 'other']

/**
 * GET /api/private/disputes?bookingId=... — list disputes the caller can see for
 * a booking (used by the booker's UI to show an existing/open dispute).
 */
export async function GET(request: Request) {
  const { user } = await getServerSideUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('bookingId')
  if (!bookingId) return NextResponse.json({ error: 'bookingId is required.' }, { status: 400 })

  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'disputes',
    where: { booking: { equals: bookingId } },
    sort: '-createdAt',
    depth: 0,
    limit: 20,
    overrideAccess: true,
  })
  // Only surface disputes the caller is a party to.
  const uid = String(user.id)
  const visible = res.docs.filter(
    (d: any) =>
      user.accountType === 'admin' || idOf(d.raisedBy) === uid || idOf(d.against) === uid,
  )
  return NextResponse.json({ disputes: visible })
}

/**
 * POST /api/private/disputes — the booker opens a dispute on a funded engagement.
 * Only the booker (student or parent) may raise one, only while the payment is
 * still held in escrow, and only one open dispute per booking at a time. Opening
 * it freezes the escrow (see hasOpenDispute) until an admin resolves it.
 */
export async function POST(request: Request) {
  const { user } = await getServerSideUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const bookingId = body?.bookingId
  const reason = typeof body?.reason === 'string' ? body.reason : ''
  const details = typeof body?.details === 'string' ? body.details.trim() : ''

  if (!bookingId) return NextResponse.json({ error: 'bookingId is required.' }, { status: 400 })
  if (!REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Please select a valid reason.' }, { status: 400 })
  }
  if (details.length < 15) {
    return NextResponse.json({ error: 'Please describe the problem (at least 15 characters).' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  let booking: any
  try {
    booking = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 2, overrideAccess: true })
  } catch {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

  const studentId = idOf(booking.student)
  const parentId = idOf(booking.parent)
  const isBooker = studentId === String(user.id) || parentId === String(user.id)
  if (!isBooker) {
    return NextResponse.json({ error: 'Only the booker can raise a dispute.' }, { status: 403 })
  }

  // Escrow must still be held — nothing to dispute once it's refunded/paid out.
  if (booking.paymentStatus !== 'held') {
    return NextResponse.json(
      { error: 'You can only dispute an engagement while the payment is still held in escrow.' },
      { status: 409 },
    )
  }

  // One open dispute per booking.
  const open = await payload.find({
    collection: 'disputes',
    where: { and: [{ booking: { equals: bookingId } }, { status: { equals: 'open' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (open.totalDocs > 0) {
    return NextResponse.json({ error: 'There is already an open dispute for this booking.' }, { status: 409 })
  }

  const tutorUserId =
    booking.tutor && typeof booking.tutor === 'object' ? idOf(booking.tutor.user) : null

  let created: any
  try {
    created = await payload.create({
      collection: 'disputes',
      data: {
        booking: numericId(bookingId),
        raisedBy: numericId(user.id),
        against: tutorUserId ? numericId(tutorUserId) : undefined,
        reason,
        details,
        status: 'open',
      } as any,
      overrideAccess: true,
    })
  } catch (e: any) {
    // Partial-unique index closes the two-concurrent-POST race the check above can't.
    if (e?.code === '23505' || /unique|one_open_per_booking/i.test(String(e?.message || ''))) {
      return NextResponse.json({ error: 'There is already an open dispute for this booking.' }, { status: 409 })
    }
    throw e
  }

  // Notify the tutor and any admins-relevant channel (tutor here).
  if (tutorUserId) {
    await createNotification({
      recipientId: tutorUserId,
      type: 'general',
      title: 'A dispute was opened',
      message: 'A booker opened a dispute on one of your engagements. Our team will review it — the payout is paused meanwhile.',
      link: '/dashboard/tutor/bookings',
      relatedCollection: 'bookings',
      relatedId: String(bookingId),
    })
  }

  return NextResponse.json({ success: true, dispute: created })
}

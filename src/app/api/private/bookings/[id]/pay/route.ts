import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'
import { holdBookingEscrow } from '@/lib/escrow'
import { createNotification } from '@/lib/notification-service'

const idOf = (rel: any): string | null =>
  rel == null ? null : String(typeof rel === 'object' ? rel.id : rel)

/**
 * POST /api/private/bookings/[id]/pay
 * The booker pays a confirmed booking from their wallet balance — the funds are
 * held in escrow (wallet.lockedBalance, booking.paymentStatus = 'held').
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getServerSideUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const payload = await getPayload({ config })

  let booking: any
  try {
    booking = await payload.findByID({ collection: 'bookings', id, depth: 2, overrideAccess: true })
  } catch {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

  // Only the booker (the student, or the parent who placed it) may pay.
  const isBooker =
    idOf(booking.student) === String(user.id) || idOf(booking.parent) === String(user.id)
  if (!isBooker) {
    return NextResponse.json({ error: 'You are not the booker of this booking.' }, { status: 403 })
  }

  const result = await holdBookingEscrow({
    payload,
    bookingId: id,
    source: 'wallet',
    reference: `escrow-wallet-${id}`,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, shortfall: result.shortfall },
      { status: result.status || 400 },
    )
  }

  // Notify the tutor that the booking is now funded (only on a fresh hold).
  if (result.held) {
    const tutorProfile = booking.tutor
    const tutorUserId =
      tutorProfile && typeof tutorProfile === 'object' ? idOf(tutorProfile.user) : null
    if (tutorUserId) {
      await createNotification({
        recipientId: tutorUserId,
        type: 'payment_received',
        title: 'Booking funded',
        message: `${user.firstName} ${user.lastName} paid for their booking — funds are held in escrow.`,
        link: '/dashboard/tutor/bookings',
        relatedCollection: 'bookings',
        relatedId: String(id),
      })
    }
  }

  return NextResponse.json({ success: true, alreadyHeld: Boolean(result.alreadyHeld) })
}

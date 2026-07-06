import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'
import { getBaseEmailLayout, getEmailServerUrl } from '@/lib/email-template'
import { sendEmail } from '@/lib/email-service'
import { createNotification } from '@/lib/notification-service'
import { releaseBookingEscrow, releaseRemainingEscrowToTutor, hasOpenDispute } from '@/lib/escrow'

type Action = 'accept' | 'decline' | 'cancel' | 'complete'

const idOf = (rel: any): string | null =>
  rel == null ? null : String(typeof rel === 'object' ? rel.id : rel)

/**
 * PATCH /api/private/bookings/[id]
 * Booking lifecycle transitions:
 *   - tutor:  accept (pending → confirmed) | decline (pending → cancelled)
 *   - booker: cancel (pending|confirmed → cancelled)
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getServerSideUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const action = body?.action as Action
    if (!['accept', 'decline', 'cancel', 'complete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const booking = await payload.findByID({
      collection: 'bookings',
      id,
      depth: 2,
      overrideAccess: true,
    })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    // Resolve the parties.
    const studentUserId = idOf(booking.student)
    const parentUserId = idOf(booking.parent)
    const tutorProfile = booking.tutor as any
    const tutorUserId = idOf(
      tutorProfile && typeof tutorProfile === 'object' ? tutorProfile.user : null,
    )

    const isTutor = tutorUserId != null && String(tutorUserId) === String(user.id)
    const isBooker =
      String(studentUserId) === String(user.id) || String(parentUserId) === String(user.id)

    // Authorize the action against the actor + current status.
    const status = booking.status

    // Stage 7 — the tutor marks the engagement complete: release the remaining
    // escrow to the tutor and settle the booking. Handled separately (its own
    // escrow helper sets status/paymentStatus + completes the class).
    if (action === 'complete') {
      if (!isTutor) {
        return NextResponse.json({ error: 'Only the tutor can complete an engagement.' }, { status: 403 })
      }
      if (status !== 'confirmed' && status !== 'in_progress') {
        return NextResponse.json({ error: 'This booking cannot be completed.' }, { status: 409 })
      }
      if (booking.paymentStatus !== 'held') {
        return NextResponse.json({ error: 'This booking has not been paid.' }, { status: 409 })
      }
      // Frozen while a dispute is open — an admin must resolve it first.
      if (await hasOpenDispute(payload, id)) {
        return NextResponse.json(
          { error: 'This engagement has an open dispute and cannot be completed until it is resolved.' },
          { status: 409 },
        )
      }
      const settle = await releaseRemainingEscrowToTutor({ payload, bookingId: id })
      if (!settle.ok) {
        return NextResponse.json({ error: settle.error || 'Could not complete the engagement.' }, { status: settle.status || 500 })
      }
      // Notify the booker: engagement done + prompt a review.
      const bookerId = parentUserId || studentUserId
      if (bookerId) {
        await createNotification({
          recipientId: String(bookerId),
          type: 'general',
          title: 'Engagement completed',
          message: `Your tutoring engagement is complete. Leave a review to help other learners.`,
          link: parentUserId ? '/dashboard/parent/bookings' : '/dashboard/student/bookings',
          relatedCollection: 'bookings',
          relatedId: String(id),
        })
      }
      const updatedBooking = await payload.findByID({ collection: 'bookings', id, depth: 0, overrideAccess: true })
      return NextResponse.json({ success: true, booking: updatedBooking })
    }

    let nextStatus: string | null = null

    if (action === 'accept' || action === 'decline') {
      if (!isTutor) {
        return NextResponse.json({ error: 'Only the tutor can do that.' }, { status: 403 })
      }
      if (status !== 'pending') {
        return NextResponse.json(
          { error: 'This booking is no longer pending.' },
          { status: 409 },
        )
      }
      nextStatus = action === 'accept' ? 'confirmed' : 'cancelled'
    } else if (action === 'cancel') {
      if (!isBooker) {
        return NextResponse.json({ error: 'Only the booker can cancel.' }, { status: 403 })
      }
      if (status !== 'pending' && status !== 'confirmed') {
        return NextResponse.json(
          { error: 'This booking can no longer be cancelled.' },
          { status: 409 },
        )
      }
      nextStatus = 'cancelled'
    }

    // If a FUNDED booking is being cancelled, release the escrow back to the
    // booker's wallet first (refund) so the money isn't trapped.
    if (action === 'cancel' && booking.paymentStatus === 'held') {
      const release = await releaseBookingEscrow({ payload, bookingId: id })
      if (!release.ok) {
        return NextResponse.json(
          { error: release.error || 'Could not release the escrowed funds.' },
          { status: release.status || 500 },
        )
      }
    }

    // Cancelling a booking must also cancel its materialized class, otherwise a
    // refunded engagement's live room could still be started/run (for free).
    if (action === 'cancel' && booking.class) {
      const classId = typeof booking.class === 'object' ? booking.class.id : booking.class
      await payload
        .update({
          collection: 'classes',
          id: classId,
          data: { status: 'cancelled' } as any,
          overrideAccess: true,
        })
        .catch((e) => console.error('[bookings/cancel] failed to cancel class:', e?.message))
    }

    const updated = await payload.update({
      collection: 'bookings',
      id,
      data: { status: nextStatus } as any,
      overrideAccess: true,
    })

    // Notify the other party.
    const headers = await getHeaders()
    const serverUrl = getEmailServerUrl(headers)

    // The recipient user: on accept/decline notify the booker; on cancel notify the tutor.
    let recipientUserId: string | null = null
    let recipientRoleLink = '/dashboard'
    if (action === 'cancel') {
      recipientUserId = tutorUserId
      recipientRoleLink = '/dashboard/tutor/bookings'
    } else {
      // Prefer the parent (they placed the booking) else the student.
      recipientUserId = parentUserId || studentUserId
    }

    // Build a friendly message.
    const verb = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled'

    if (recipientUserId) {
      let recipientEmail = ''
      let recipientLink = recipientRoleLink
      try {
        const recipient = await payload.findByID({
          collection: 'users',
          id: recipientUserId,
          overrideAccess: true,
        })
        recipientEmail = recipient?.email || ''
        if (action !== 'cancel') {
          recipientLink =
            recipient?.accountType === 'parent'
              ? '/dashboard/parent/bookings'
              : '/dashboard/student/bookings'
        }
      } catch {
        /* ignore */
      }

      await createNotification({
        recipientId: String(recipientUserId),
        type: 'general',
        title: `Booking ${verb}`,
        message:
          action === 'cancel'
            ? `A booking was cancelled by ${user.firstName} ${user.lastName}.`
            : `Your booking request was ${verb} by the tutor.`,
        link: recipientLink,
        relatedCollection: 'bookings',
        relatedId: String(id),
      })

      if (recipientEmail) {
        const htmlContent = `
          <p class="text">Hi there,</p>
          <p class="text">Your booking has been <strong>${verb}</strong>.</p>
          <div class="btn-container">
            <a href="${serverUrl}${recipientLink}" class="btn">View Booking</a>
          </div>
        `
        await sendEmail({
          to: recipientEmail,
          subject: `Booking ${verb} - TutorCourt`,
          html: getBaseEmailLayout(`Booking ${verb}`, htmlContent, serverUrl),
        }).catch((e) => console.error('[bookings/PATCH] email failed:', e?.message))
      }
    }

    return NextResponse.json({ success: true, booking: updated })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error updating booking' },
      { status: 500 },
    )
  }
}

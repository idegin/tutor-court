import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { releaseRemainingEscrowToTutor, hasOpenDispute } from '@/lib/escrow'
import { createNotification } from '@/lib/notification-service'

const idOf = (rel: any): string | null =>
  rel == null ? null : String(typeof rel === 'object' ? rel.id : rel)

/**
 * Cron: auto-complete past-`endDate` engagements whose escrow is still held, so
 * money isn't trapped when a tutor never clicks "mark complete". Conservative by
 * design — it only settles engagements that actually ran (≥1 ended live session)
 * and have no open dispute; a paid-but-never-taught booking is LEFT for a booker
 * dispute / admin, never auto-paid to the tutor.
 *
 * Protect with CRON_SECRET (Bearer token). Schedule daily via an external cron
 * (Vercel Cron / GitHub Actions / cron-job.org).
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 })
  }
  const auth = request.headers.get('authorization') || ''
  const provided = auth.replace(/^Bearer\s+/i, '')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const nowIso = new Date().toISOString()

  const due = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { paymentStatus: { equals: 'held' } },
        { or: [{ status: { equals: 'confirmed' } }, { status: { equals: 'in_progress' } }] },
        { endDate: { less_than: nowIso } },
      ],
    },
    depth: 2,
    limit: 200,
    overrideAccess: true,
  })

  const result = { scanned: due.totalDocs, completed: 0, skippedDispute: 0, skippedNoSessions: 0, failed: 0 }

  for (const booking of due.docs as any[]) {
    const bookingId = booking.id
    try {
      if (await hasOpenDispute(payload, bookingId)) {
        result.skippedDispute++
        continue
      }

      // Only settle engagements that actually ran — a booking whose class had no
      // ended session is a possible no-show; leave it for dispute/admin.
      const classId = idOf(booking.class)
      let endedSessions = 0
      if (classId) {
        const sessions = await payload.find({
          collection: 'live-sessions',
          where: { and: [{ class: { equals: classId } }, { status: { equals: 'ended' } }] },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        endedSessions = sessions.totalDocs
      }
      if (endedSessions === 0) {
        result.skippedNoSessions++
        continue
      }

      const settle = await releaseRemainingEscrowToTutor({ payload, bookingId })
      if (!settle.ok) {
        result.failed++
        continue
      }
      result.completed++

      // Notify both parties.
      const studentId = idOf(booking.student)
      const parentId = idOf(booking.parent)
      const bookerId = parentId || studentId
      const tutorUserId =
        booking.tutor && typeof booking.tutor === 'object' ? idOf(booking.tutor.user) : null
      if (bookerId) {
        await createNotification({
          recipientId: bookerId,
          type: 'general',
          title: 'Engagement completed',
          message: 'Your tutoring engagement has ended. Leave a review to help other learners.',
          link: parentId ? '/dashboard/parent/bookings' : '/dashboard/student/bookings',
          relatedCollection: 'bookings',
          relatedId: String(bookingId),
        })
      }
      if (tutorUserId) {
        await createNotification({
          recipientId: tutorUserId,
          type: 'payment_received',
          title: 'Escrow released',
          message: 'A completed engagement has settled and the remaining escrow was released to your wallet.',
          link: '/dashboard/tutor/wallet',
          relatedCollection: 'bookings',
          relatedId: String(bookingId),
        })
      }
    } catch (e: any) {
      result.failed++
      payload.logger?.error?.(`[cron/complete-engagements] booking ${bookingId} failed: ${e?.message}`)
    }
  }

  return NextResponse.json({ ok: true, ...result })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}

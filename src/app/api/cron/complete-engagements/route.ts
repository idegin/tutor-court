import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { releaseRemainingEscrowToTutor, hasOpenDispute } from '@/lib/escrow'
import { createNotification } from '@/lib/notification-service'
import { emailUserById } from '@/lib/transactional-email'

const idOf = (rel: any): string | null =>
  rel == null ? null : String(typeof rel === 'object' ? rel.id : rel)

/**
 * Cron: auto-release held escrow so money isn't trapped. Two buckets:
 *
 *   A) status `awaiting_release` — the tutor marked work delivered and the booker
 *      neither released nor disputed within the grace window. We trust the
 *      tutor's assertion (the booker had their chance) and release.
 *   B) status `confirmed`/`in_progress` past `endDate` — neither party acted.
 *      Conservative: only settle engagements that actually ran (≥1 ended live
 *      session); a paid-but-never-taught booking is LEFT for a booker dispute /
 *      admin, never auto-paid to the tutor.
 *
 * Both buckets skip engagements with an open dispute.
 *
 * Protect with CRON_SECRET (Bearer token). Schedule daily via an external cron
 * (Vercel Cron / QStash — see scripts/setup-qstash-schedules.ts).
 */
const AUTO_RELEASE_GRACE_MS = 3 * 24 * 60 * 60 * 1000 // booker has 3 days to act after "delivered"

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
  const graceIso = new Date(Date.now() - AUTO_RELEASE_GRACE_MS).toISOString()

  const due = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { paymentStatus: { equals: 'held' } },
        {
          or: [
            // Bucket A — delivered, booker didn't act within the grace window.
            {
              and: [
                { status: { equals: 'awaiting_release' } },
                { awaitingReleaseAt: { less_than: graceIso } },
              ],
            },
            // Bucket B — neither party acted and the engagement window passed.
            {
              and: [
                { or: [{ status: { equals: 'confirmed' } }, { status: { equals: 'in_progress' } }] },
                { endDate: { less_than: nowIso } },
              ],
            },
          ],
        },
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

      // No-show guard (BOTH buckets): auto-release only when the engagement
      // actually ran (≥1 ended live session). A tutor who no-shows but clicks
      // "Mark delivered" (→ awaiting_release) must NOT be auto-paid; that case
      // is left for the booker to release manually or dispute. This closes the
      // hole where marking delivered would bypass the no-show protection.
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
        const bookerLink = parentId ? '/dashboard/parent/bookings' : '/dashboard/student/bookings'
        await createNotification({
          recipientId: bookerId,
          type: 'general',
          title: 'Engagement completed',
          message: 'Your tutoring engagement has ended. Leave a review to help other learners.',
          link: bookerLink,
          relatedCollection: 'bookings',
          relatedId: String(bookingId),
        })
        await emailUserById(
          payload,
          bookerId,
          'Your tutoring engagement has ended - TutorCourt',
          'Engagement completed',
          `<p class="text">Your tutoring engagement has ended and the payment held in escrow was released to your tutor. Thanks for using TutorCourt — leave a review to help other learners.</p>`,
          { link: bookerLink, linkLabel: 'View booking' },
        )
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
        await emailUserById(
          payload,
          tutorUserId,
          'Escrow released to your wallet - TutorCourt',
          'Payment released to your wallet',
          `<p class="text">A completed engagement has settled and the remaining escrow was <strong>released to your wallet</strong>. It's available to withdraw or spend.</p>`,
          { link: '/dashboard/tutor/wallet', linkLabel: 'View wallet' },
        )
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

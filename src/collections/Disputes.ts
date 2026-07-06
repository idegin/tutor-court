import type { CollectionConfig } from 'payload'
import { releaseBookingEscrow, releaseRemainingEscrowToTutor } from '../lib/escrow'
import { createNotification } from '../lib/notification-service'

const idOf = (rel: any): string | null =>
  rel == null ? null : String(typeof rel === 'object' ? rel.id : rel)

/**
 * A booker-raised dispute against a funded (held-in-escrow) engagement. While a
 * dispute is `open` the escrow is frozen — per-session payouts and the tutor's
 * "mark complete" are blocked (see hasOpenDispute in lib/escrow). An admin
 * resolves it in the Payload admin by setting the status:
 *   - resolved_refund  → escrow refunded to the booker, booking refunded
 *   - resolved_release → remaining escrow released to the tutor, booking completed
 *   - rejected         → no money moves, dispute closed
 * The money movement runs FIRST; if it fails the status change is rolled back so
 * a dispute never reads "resolved" without the matching escrow action.
 */
export const Disputes: CollectionConfig = {
  slug: 'disputes',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['booking', 'raisedBy', 'reason', 'status', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      // A party to the dispute (booker who raised it, or the tutor it's against).
      return { or: [{ raisedBy: { equals: user.id } }, { against: { equals: user.id } }] } as any
    },
    create: () => false, // created server-side via the disputes route
    update: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
    delete: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
  },
  fields: [
    { name: 'booking', type: 'relationship', relationTo: 'bookings', required: true, index: true },
    { name: 'raisedBy', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'against', type: 'relationship', relationTo: 'users', index: true },
    {
      name: 'reason',
      type: 'select',
      required: true,
      options: [
        { label: 'Tutor did not show up', value: 'no_show' },
        { label: 'Quality of tutoring', value: 'quality' },
        { label: 'Scheduling problems', value: 'scheduling' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'details', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      index: true,
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Resolved — refunded to booker', value: 'resolved_refund' },
        { label: 'Resolved — released to tutor', value: 'resolved_release' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    { name: 'resolutionNote', type: 'textarea' },
    { name: 'resolvedBy', type: 'relationship', relationTo: 'users' },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Only act when an admin moves an OPEN dispute to a resolved state.
        if (operation !== 'update') return
        if (previousDoc?.status !== 'open' || doc.status === 'open') return
        if (!['resolved_refund', 'resolved_release', 'rejected'].includes(doc.status)) return

        const payload = req.payload
        const bookingId = idOf(doc.booking)
        if (!bookingId) return

        // Money movement first — the escrow helpers manage their own atomic
        // transactions and are idempotent by reference. If one fails, throw so
        // this status change rolls back and the dispute stays open for a retry.
        if (doc.status === 'resolved_refund') {
          const r = await releaseBookingEscrow({ payload, bookingId })
          if (!r.ok) throw new Error(r.error || 'Refund failed; dispute left open.')
          // Reflect the outcome on the booking itself.
          await payload
            .update({ collection: 'bookings', id: bookingId, data: { status: 'refunded' } as any, overrideAccess: true })
            .catch(() => {})
        } else if (doc.status === 'resolved_release') {
          const r = await releaseRemainingEscrowToTutor({ payload, bookingId })
          if (!r.ok) throw new Error(r.error || 'Payout failed; dispute left open.')
        }

        // Notify both parties of the resolution (non-critical).
        const bookerId = idOf(doc.raisedBy)
        const tutorUserId = idOf(doc.against)
        const outcome =
          doc.status === 'resolved_refund'
            ? 'Your dispute was resolved in your favour — the payment has been refunded to your wallet.'
            : doc.status === 'resolved_release'
              ? 'Your dispute was reviewed and the engagement was settled with the tutor.'
              : 'Your dispute was reviewed and closed.'
        if (bookerId) {
          await createNotification({
            recipientId: bookerId,
            type: 'general',
            title: 'Dispute resolved',
            message: outcome,
            link: '/dashboard/student/bookings',
            relatedCollection: 'bookings',
            relatedId: bookingId,
          })
        }
        if (tutorUserId) {
          await createNotification({
            recipientId: tutorUserId,
            type: 'general',
            title: 'Dispute resolved',
            message:
              doc.status === 'resolved_refund'
                ? 'A dispute on one of your engagements was resolved with a refund to the booker.'
                : doc.status === 'resolved_release'
                  ? 'A dispute on one of your engagements was resolved — the escrow was released to you.'
                  : 'A dispute on one of your engagements was reviewed and closed.',
            link: '/dashboard/tutor/bookings',
            relatedCollection: 'bookings',
            relatedId: bookingId,
          })
        }
      },
    ],
  },
  timestamps: true,
}

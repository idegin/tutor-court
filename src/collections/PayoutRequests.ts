import type { CollectionConfig } from 'payload'
import { debitWalletAtomic, unlockEscrowAtomic } from '@/lib/escrow'
import { emailUserById } from '@/lib/transactional-email'

/**
 * A tutor's request to withdraw spendable wallet funds to a bank account.
 * On request the amount is reserved (wallet.lockedBalance += amount). An admin
 * approves (→ funds leave the wallet, a `payout` transaction is booked) or
 * rejects (→ the reservation is released). See the beforeChange/afterChange
 * hooks below for the money movement.
 */
export const PayoutRequests: CollectionConfig = {
  slug: 'payout-requests',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['tutor', 'amount', 'status', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { tutor: { equals: user.id } } as any
    },
    create: () => false, // created server-side via the withdrawals route
    update: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
    delete: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
  },
  fields: [
    { name: 'tutor', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'amount', type: 'number', required: true, min: 1 },
    { name: 'currency', type: 'select', options: ['ngn', 'usd'], defaultValue: 'ngn', required: true },
    { name: 'bankName', type: 'text' },
    { name: 'accountNumber', type: 'text' },
    { name: 'accountName', type: 'text' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'requested',
      index: true,
      options: [
        { label: 'Requested', value: 'requested' },
        { label: 'Approved / Paid', value: 'paid' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    { name: 'transaction', type: 'relationship', relationTo: 'transactions', hasMany: false },
    { name: 'adminNote', type: 'textarea' },
    // Paystack Transfer tracking (set on approval / finalized by the transfer webhook).
    { name: 'recipientCode', type: 'text', admin: { readOnly: true, description: 'Paystack transfer recipient code snapshot.' } },
    { name: 'transferReference', type: 'text', index: true, admin: { readOnly: true } },
    { name: 'transferCode', type: 'text', admin: { readOnly: true, description: 'Paystack transfer_code once the disbursement is initiated.' } },
    {
      name: 'transferStatus',
      type: 'select',
      admin: { readOnly: true, description: 'Paystack transfer lifecycle.' },
      options: [
        { label: 'None', value: 'none' },
        { label: 'Processing', value: 'processing' },
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Only act on an admin status transition away from 'requested'.
        if (operation !== 'update') return
        if (previousDoc?.status === doc.status) return
        // Only the two funded transitions move money.
        const isApproval = doc.status === 'paid' && previousDoc?.status === 'requested'
        const isRejection = doc.status === 'rejected' && previousDoc?.status === 'requested'
        if (!isApproval && !isRejection) return
        const tutorId = typeof doc.tutor === 'object' ? doc.tutor.id : doc.tutor
        const amount = Number(doc.amount) || 0
        const payload = req.payload

        // Idempotency: if this request's payout was already booked, don't move
        // money again on a re-save.
        const already = await payload.find({
          collection: 'transactions',
          where: { reference: { equals: `withdrawal-${doc.id}` } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })
        if (isApproval && already.totalDocs > 0) return

        const walletRes = await payload.find({
          collection: 'wallets',
          where: { user: { equals: tutorId } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })
        const wallet = walletRes.docs[0] as any
        // No wallet on an approval is a hard error — do NOT let 'paid' commit
        // with no debit. Throwing rolls back the status change in the request tx.
        if (!wallet) {
          if (isApproval) throw new Error('Cannot approve payout: tutor wallet not found.')
          return
        }
        if (isApproval) {
          // Money-safety: debit atomically against the LIVE balance so a
          // concurrent escrow credit to this tutor can't be lost to a stale
          // read-then-write, and never pay out more than the wallet holds. A
          // false result (insufficient balance) throws → rolls back 'paid'.
          const ok = await debitWalletAtomic(payload, req, wallet.id, amount)
          if (!ok) {
            throw new Error('Cannot approve payout: insufficient wallet balance.')
          }
          // Errors are NOT swallowed — a failed transaction must roll back the
          // 'paid' status change (the debit is in the same tx).
          await payload.create({
            collection: 'transactions',
            data: {
              reference: `withdrawal-${doc.id}`,
              gateway: doc.recipientCode ? 'paystack' : 'manual',
              type: 'payout',
              sender: tutorId,
              receiver: tutorId,
              amount,
              currency: doc.currency || 'ngn',
              status: 'success',
              description: 'Tutor withdrawal to bank account',
            } as any,
            overrideAccess: true,
            req,
          })

          // Disburse via Paystack when a recipient is on file. We do NOT call
          // Paystack here (never make an external payment call inside a DB
          // transaction — a lost response could roll back the debit after the
          // money left). Instead we persist the intent (deterministic reference)
          // and let the `process-payouts` cron initiate the idempotent transfer
          // and the webhook/cron finalize it. This keeps debit + intent atomic.
          if (doc.recipientCode) {
            // Status-only update → does not re-trigger the money path (the hook
            // early-returns when status is unchanged).
            await payload.update({
              collection: 'payout-requests',
              id: doc.id,
              data: { transferReference: `withdrawal-${doc.id}`, transferStatus: 'processing' } as any,
              overrideAccess: true,
              req,
            })
          } else {
            // Manual/offline payout — no gateway transfer; notify the tutor now.
            await emailUserById(
              payload,
              tutorId,
              'Your withdrawal was processed - TutorCourt',
              'Withdrawal processed',
              `<p class="text">Your withdrawal of ₦${amount.toLocaleString()} has been processed to your bank account.</p>`,
              { link: '/dashboard/tutor/wallet', linkLabel: 'View wallet' },
            )
          }
        } else if (isRejection) {
          // Release the reservation back to spendable (atomic).
          await unlockEscrowAtomic(payload, req, wallet.id, amount)
        }
      },
    ],
  },
  timestamps: true,
}

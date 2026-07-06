import type { CollectionConfig } from 'payload'

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
        const balance = Number(wallet.balance) || 0
        const locked = Number(wallet.lockedBalance) || 0

        if (isApproval) {
          // Money-safety backstop: never pay out more than the wallet actually
          // holds. Even if concurrent withdrawal requests under-reserved
          // lockedBalance (a lost update), this stops real value from leaving
          // beyond the tutor's real balance — the approval fails and rolls back.
          if (balance < amount) {
            throw new Error('Cannot approve payout: insufficient wallet balance.')
          }
          // Funds leave the wallet entirely; book a completed payout transaction.
          // Errors are NOT swallowed — a failed debit or transaction must roll
          // back the 'paid' status change.
          await payload.update({
            collection: 'wallets',
            id: wallet.id,
            data: { balance: Math.max(0, balance - amount), lockedBalance: Math.max(0, locked - amount) } as any,
            overrideAccess: true,
            req,
          })
          await payload.create({
            collection: 'transactions',
            data: {
              reference: `withdrawal-${doc.id}`,
              gateway: 'manual',
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
        } else if (isRejection) {
          // Release the reservation back to spendable.
          await payload.update({
            collection: 'wallets',
            id: wallet.id,
            data: { lockedBalance: Math.max(0, locked - amount) } as any,
            overrideAccess: true,
            req,
          })
        }
      },
    ],
  },
  timestamps: true,
}

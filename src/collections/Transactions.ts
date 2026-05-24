import type { CollectionConfig } from 'payload'

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: {
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'type', 'status', 'amount', 'currency', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return {
        or: [
          { sender: { equals: user.id } },
          { receiver: { equals: user.id } },
          { tutor: { equals: user.id } },
        ],
      } as any
    },
    // Writes are server-side only: route handlers / webhooks bypass access via Local API.
    create: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
    update: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
    delete: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
  },
  fields: [
    {
      name: 'reference',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'Internal or gateway reference (e.g. Paystack reference). Unique.',
      },
    },
    {
      name: 'gateway',
      type: 'select',
      defaultValue: 'wallet',
      options: [
        { label: 'Wallet (internal)', value: 'wallet' },
        { label: 'Paystack', value: 'paystack' },
        { label: 'Manual / Admin', value: 'manual' },
      ],
      required: true,
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Deposit / Top-Up', value: 'deposit' },
        { label: 'Payment', value: 'payment' },
        { label: 'Refund', value: 'refund' },
        { label: 'Payout', value: 'payout' },
        { label: 'Credit Grant', value: 'credit_grant' },
        { label: 'Adjustment', value: 'adjustment' },
      ],
    },
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      index: true,
    },
    {
      name: 'receiver',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      index: true,
    },
    {
      name: 'tutor',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      hasMany: false,
      index: true,
    },
    {
      name: 'relatedBooking',
      type: 'relationship',
      relationTo: 'bookings',
      hasMany: false,
    },
    {
      name: 'relatedLiveSession',
      type: 'relationship',
      relationTo: 'live-sessions',
      hasMany: false,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
      admin: { description: 'Amount in the smallest non-decimal unit (e.g. kobo or cents).' },
    },
    {
      name: 'currency',
      type: 'select',
      options: [
        { label: 'NGN', value: 'ngn' },
        { label: 'USD', value: 'usd' },
      ],
      required: true,
      defaultValue: 'ngn',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Successful', value: 'success' },
        { label: 'Failed', value: 'failed' },
        { label: 'Reversed', value: 'reversed' },
      ],
      required: true,
      defaultValue: 'pending',
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'metadata',
      type: 'json',
      admin: { description: 'Gateway response payload, idempotency keys, etc.' },
    },
  ],
  timestamps: true,
}

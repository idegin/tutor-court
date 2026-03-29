import type { CollectionConfig } from 'payload'

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: {
    useAsTitle: 'id',
  },
  access: {
    read: ({ req: { user } }) => {
      // Basic access control
      if (user?.accountType === 'admin') return true
      return {
        or: [
          { sender: { equals: user?.id } },
          { receiver: { equals: user?.id } },
          { tutor: { equals: user?.id } },
        ],
      } as any
    },
  },
  fields: [
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'receiver',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'tutor',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      hasMany: false,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
    },
    {
      name: 'currency',
      type: 'select',
      options: [
        { label: 'USD', value: 'usd' },
        { label: 'NGN', value: 'ngn' },
      ],
      required: true,
      defaultValue: 'usd',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Pending', value: 'pending' },
      ],
      required: true,
      defaultValue: 'pending',
    },
  ],
}

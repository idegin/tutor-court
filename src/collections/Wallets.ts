import type { CollectionConfig } from 'payload'

export const Wallets: CollectionConfig = {
  slug: 'wallets',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'currency', 'balance', 'creditBalance'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
    update: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
    delete: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      unique: true,
      index: true,
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
      name: 'balance',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'creditBalance',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
  ],
  timestamps: true,
}

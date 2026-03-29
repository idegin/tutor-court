import type { CollectionConfig } from 'payload'

export const Wallets: CollectionConfig = {
  slug: 'wallets',
  admin: {
    useAsTitle: 'id',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.accountType === 'admin') return true
      return { user: { equals: user?.id } }
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
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
      name: 'balance',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
  ],
}

import type { CollectionConfig } from 'payload'

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['tutor', 'user', 'rating', 'createdAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'review',
      type: 'textarea',
      required: true,
    },
    {
      name: 'rating',
      type: 'number',
      min: 1,
      max: 5,
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'tutor',
      type: 'relationship',
      relationTo: 'tutor-profiles',
      required: true,
      hasMany: false,
    },
  ],
  timestamps: true,
}

import type { CollectionConfig } from 'payload'

export const TutorProfiles: CollectionConfig = {
  slug: 'tutor-profiles',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'isApproved'],
  },
  access: {
    read: () => true,
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
      name: 'isApproved',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Check to approve this tutor profile.',
      },
    },
    // Add additional tutor-specific fields here (e.g., bio, subjects, rate)
  ],
}

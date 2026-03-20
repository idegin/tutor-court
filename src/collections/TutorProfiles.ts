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
    {
      name: 'onboardingCompleted',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether the tutor has completed the onboarding flow.',
      },
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'yearsOfExperience',
      type: 'number',
    },
    {
      name: 'mode',
      type: 'select',
      options: [
        { label: 'Online', value: 'online' },
        { label: 'Hybrid', value: 'hybrid' },
      ],
    },
    // Add additional tutor-specific fields here (e.g., subjects, rate)
  ],
}

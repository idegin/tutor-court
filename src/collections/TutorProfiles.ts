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
      name: 'rating',
      type: 'number',
      min: 0,
      max: 5,
      defaultValue: 0,
      admin: {
        description: 'Average rating for this tutor (0-5).',
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
    {
      name: 'usagePlan',
      type: 'select',
      options: [
        { label: 'Existing Students', value: 'existing' },
        { label: 'Marketplace', value: 'marketplace' },
        { label: 'Both', value: 'both' },
      ],
      admin: {
        description: 'How the tutor plans to use TutorCourt.',
      },
    },
    {
      name: 'subjects',
      type: 'relationship',
      relationTo: 'subjects',
      hasMany: true,
      admin: {
        description: 'Subjects this tutor teaches.',
      },
    },
    {
      name: 'hourlyRate',
      type: 'number',
      admin: {
        description: 'Hourly rate in Naira.',
      },
    },
  ],
}

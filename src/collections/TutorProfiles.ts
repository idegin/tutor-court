import type { CollectionConfig } from 'payload'

const generateUniqueSlug = async (payload: any, baseSlug: string, count = 0): Promise<string> => {
  const customId = Math.random().toString(36).substring(2, 7);
  const newSlug = count === 0 ? baseSlug : `${baseSlug}-${customId}`;
  
  const existingProfiles = await payload.find({
    collection: 'tutor-profiles',
    where: {
      slug: {
        equals: newSlug,
      },
    },
  });

  if (existingProfiles.totalDocs > 0) {
    return generateUniqueSlug(payload, baseSlug, count + 1);
  }

  return newSlug;
};

export const TutorProfiles: CollectionConfig = {
  slug: 'tutor-profiles',
  admin: {
    useAsTitle: 'slug',
    defaultColumns: ['user', 'slug', 'isApproved', 'backgroundCheckStatus', 'identityVerified'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { user: { equals: user.id } } as any
    },
    delete: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation === 'create' || (operation === 'update' && !data?.slug)) {
          if (!data?.slug && data?.user) {
            const user = await req.payload.findByID({
              collection: 'users',
              id: data.user,
            });
            
            if (user && user.firstName && user.lastName) {
              const baseSlug = `${user.firstName}-${user.lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
              data.slug = await generateUniqueSlug(req.payload, baseSlug);
            }
          }
        }
        return data;
      }
    ]
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      unique: true,
      required: true,
      admin: {
        description: 'Auto-generated unique slug for the tutor profile.',
        readOnly: true,
      },
    },
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
      name: 'isApproved',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description: 'Check to approve this tutor profile.',
      },
      access: {
        update: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
      },
    },
    {
      name: 'backgroundCheckStatus',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'Not Submitted', value: 'none' },
        { label: 'Pending', value: 'pending' },
        { label: 'Cleared', value: 'cleared' },
        { label: 'Failed', value: 'failed' },
        { label: 'Expired', value: 'expired' },
      ],
      index: true,
      admin: {
        description: 'K-12 safety: tutors should be cleared before teaching minors.',
      },
      access: {
        update: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
      },
    },
    {
      name: 'backgroundCheckCompletedAt',
      type: 'date',
      access: {
        update: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
      },
    },
    {
      name: 'identityVerified',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether government-issued ID has been verified.',
      },
      access: {
        update: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
      },
    },
    {
      name: 'identityDocument',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Government-issued ID for identity verification (admin-reviewed).',
      },
      access: {
        read: ({ req: { user }, doc }: any) => {
          if (!user) return false
          if (user.accountType === 'admin') return true
          const ownerId = typeof doc?.user === 'object' ? doc?.user?.id : doc?.user
          return ownerId === user.id
        },
      },
    },
    {
      name: 'teachingCertifications',
      type: 'array',
      admin: {
        description: 'Teaching certificates, degrees, or credentials.',
      },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'issuingBody', type: 'text' },
        { name: 'issueDate', type: 'date' },
        { name: 'expiryDate', type: 'date' },
        { name: 'document', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'gradesTaught',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Kindergarten', value: 'K' },
        { label: 'Grade 1', value: '1' },
        { label: 'Grade 2', value: '2' },
        { label: 'Grade 3', value: '3' },
        { label: 'Grade 4', value: '4' },
        { label: 'Grade 5', value: '5' },
        { label: 'Grade 6', value: '6' },
        { label: 'Grade 7', value: '7' },
        { label: 'Grade 8', value: '8' },
        { label: 'Grade 9', value: '9' },
        { label: 'Grade 10', value: '10' },
        { label: 'Grade 11', value: '11' },
        { label: 'Grade 12', value: '12' },
      ],
      admin: {
        description: 'K-12 grade levels this tutor is qualified to teach.',
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
      name: 'totalReviews',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Total number of reviews received by this tutor.',
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
      name: 'headline',
      type: 'text',
      admin: {
        description: 'A short headline or tagline for the tutor profile.',
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
    {
      name: 'type',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'One on One', value: 'one-on-one' },
        { label: 'Group', value: 'group' },
      ],
      admin: {
        description: 'Types of classes standardly offered by this tutor.',
      },
    },
    {
      name: 'minAge',
      type: 'number',
      min: 4,
      max: 18,
      admin: {
        description: 'Minimum age of students the tutor teaches (K-12 range).',
      },
    },
    {
      name: 'maxAge',
      type: 'number',
      min: 4,
      max: 18,
      admin: {
        description: 'Maximum age of students the tutor teaches (K-12 range).',
      },
    },
  ],
  timestamps: true,
}

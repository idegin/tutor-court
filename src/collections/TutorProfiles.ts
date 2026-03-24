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
    defaultColumns: ['user', 'slug', 'isApproved'],
  },
  access: {
    read: () => true,
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
      admin: {
        description: 'Minimum age of students the tutor teaches.',
      },
    },
    {
      name: 'maxAge',
      type: 'number',
      admin: {
        description: 'Maximum age of students the tutor teaches.',
      },
    },
  ],
}

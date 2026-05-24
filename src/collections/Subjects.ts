import type { CollectionConfig } from 'payload'

export const Subjects: CollectionConfig = {
  slug: 'subjects',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'slug'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
    update: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
    delete: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'category',
      type: 'select',
      index: true,
      options: [
        { label: 'Mathematics', value: 'math' },
        { label: 'Science', value: 'science' },
        { label: 'Language Arts / English', value: 'language_arts' },
        { label: 'Social Studies', value: 'social_studies' },
        { label: 'World Languages', value: 'world_languages' },
        { label: 'Computing / STEM', value: 'computing' },
        { label: 'Arts & Music', value: 'arts' },
        { label: 'Physical Education / Health', value: 'pe_health' },
        { label: 'Test Prep', value: 'test_prep' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'gradeLevels',
      type: 'select',
      hasMany: true,
      admin: {
        description: 'K-12 grade levels this subject applies to (optional filter).',
      },
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
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ data, operation, value }) => {
            if (operation === 'create' && data?.name && !value) {
              return data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
            }
            if (operation === 'update' && data?.name && !value) {
                return data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
            }
            return value
          },
        ],
      },
    },
  ],
  timestamps: true,
}

import type { CollectionConfig } from 'payload'

export const Classes: CollectionConfig = {
  slug: 'classes',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'subject', 'isPublished', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
    },
    {
      name: 'tutorProfile',
      type: 'relationship',
      relationTo: 'tutor-profiles',
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'One on One', value: 'one-on-one' },
        { label: 'Group', value: 'group' },
        { label: 'Self Paced', value: 'self-paced' },
      ],
      required: true,
      defaultValue: 'one-on-one',
    },
    {
      name: 'learningOutcomes',
      type: 'array',
      fields: [
        {
          name: 'outcome',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'minAge',
          type: 'number',
          min: 0,
        },
        {
          name: 'maxAge',
          type: 'number',
          min: 0,
        },
      ],
    },
    {
      name: 'durationInMinutes',
      type: 'number',
      min: 0,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
          position: 'sidebar'
      }
    },
    {
      name: 'isPublished',
      type: 'checkbox',
      defaultValue: false,
      admin: {
          position: 'sidebar'
      }
    },
  ],
  timestamps: true,
}
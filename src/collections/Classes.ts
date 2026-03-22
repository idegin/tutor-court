import type { CollectionConfig } from 'payload'
import slugify from 'slugify'

export const Classes: CollectionConfig = {
  slug: 'classes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'subject', 'isPublished', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation === 'create' && data.title && !data.slug) {
          const baseSlug = slugify(data.title, { lower: true, strict: true })
          
          // Check if it's already in use
          const existing = await req.payload.find({
            collection: 'classes',
            where: {
              slug: { equals: baseSlug }
            },
            depth: 0,
            limit: 1,
            req
          })
          
          if (existing.totalDocs > 0) {
            // Append 5 char unique ID if in use
            const suffix = Math.random().toString(36).substring(2, 7)
            data.slug = `${baseSlug}-${suffix}`
          } else {
            data.slug = baseSlug
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
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
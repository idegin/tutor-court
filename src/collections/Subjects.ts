import type { CollectionConfig } from 'payload'
import { NIGERIAN_GRADES } from '../lib/constants'

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
      type: 'relationship',
      relationTo: 'subject-categories',
      required: true,
      index: true,
    },
    {
      name: 'gradeLevels',
      type: 'select',
      hasMany: true,
      admin: {
        description: 'Nigerian grade levels this subject applies to (optional filter).',
      },
      options: NIGERIAN_GRADES as any,
    },
    {
      name: 'shortDescription',
      type: 'text',
      admin: {
        description: '1-2 sentence summary shown in cards',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'icon',
      type: 'text',
      admin: {
        description: 'Emoji or icon name',
      },
    },
    {
      name: 'color',
      type: 'text',
      admin: {
        description: 'Hex accent color',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Lower = shown first',
      },
    },
    {
      name: 'isPopular',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Feature on the home page',
      },
    },
    {
      name: 'seoTitle',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Overrides page title on the public subject page',
      },
    },
    {
      name: 'seoDescription',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Overrides meta description on the public subject page',
      },
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

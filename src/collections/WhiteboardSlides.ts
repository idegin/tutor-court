import type { CollectionConfig } from 'payload'

export const WhiteboardSlides: CollectionConfig = {
  slug: 'whiteboard-slides',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['whiteboard', 'order', 'updatedAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return true
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'whiteboard',
      type: 'relationship',
      relationTo: 'whiteboards',
      required: true,
      index: true,
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'data',
      type: 'json',
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
    },
  ],
  timestamps: true,
}

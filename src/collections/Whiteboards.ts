import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const Whiteboards: CollectionConfig = {
  slug: 'whiteboards',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'owner', 'class', 'updatedAt'],
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === 'create' && data && !data.shareToken) {
          data.shareToken = crypto.randomBytes(24).toString('hex')
        }
        return data
      },
    ],
  },
  access: {
    read: async ({ req }) => {
      const { user, payload } = req
      if (!user) return false
      if (user.accountType === 'admin') return true

      if (user.accountType === 'tutor') {
        return { owner: { equals: user.id } }
      }

      if (user.accountType === 'student') {
        const studentClasses = await payload.find({
          collection: 'classes',
          where: { students: { equals: user.id } },
          limit: 100,
          depth: 0,
        })
        const classIds = studentClasses.docs.map((c: any) => c.id)
        return {
          or: [
            { class: { in: classIds } },
            { isPublic: { equals: true } },
          ],
        }
      }

      if (user.accountType === 'parent') {
        const parentClasses = await payload.find({
          collection: 'classes',
          where: { parents: { equals: user.id } },
          limit: 100,
          depth: 0,
        })
        const classIds = parentClasses.docs.map((c: any) => c.id)
        return {
          or: [
            { class: { in: classIds } },
            { isPublic: { equals: true } },
          ],
        }
      }

      return false
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { owner: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { owner: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'class',
      type: 'relationship',
      relationTo: 'classes',
      index: true,
    },
    {
      name: 'liveSession',
      type: 'relationship',
      relationTo: 'live-sessions',
      index: true,
    },
    {
      name: 'shareToken',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'Auto-generated on create. Used for public/share-link access.',
        readOnly: true,
      },
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  timestamps: true,
}

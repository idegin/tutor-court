import type { CollectionConfig, FieldAccess } from 'payload'

const parentOrAdminField: FieldAccess = ({ req: { user }, doc }) => {
  if (!user) return false
  if (user.accountType === 'admin') return true
  const parentId = typeof doc?.parent === 'object' ? doc?.parent?.id : doc?.parent
  return parentId === user.id
}

export const Students: CollectionConfig = {
  slug: 'students',
  admin: {
    useAsTitle: 'generatedEmail',
    defaultColumns: ['firstName', 'lastName', 'parent', 'generatedEmail'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      if (user.accountType === 'parent') {
        return { parent: { equals: user.id } } as any
      }
      if (user.accountType === 'tutor') {
        return true
      }
      if (user.accountType === 'student') {
        return { user: { equals: user.id } } as any
      }
      return false
    },
    create: ({ req: { user } }) =>
      Boolean(user && (user.accountType === 'parent' || user.accountType === 'admin')),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      if (user.accountType === 'parent') {
        return { parent: { equals: user.id } } as any
      }
      return false
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      if (user.accountType === 'parent') {
        return { parent: { equals: user.id } } as any
      }
      return false
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      index: true,
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      index: true,
    },
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'generatedEmail',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'generatedPassword',
      type: 'text',
      required: true,
      access: {
        read: parentOrAdminField,
      },
    },
    {
      name: 'gradeLevel',
      type: 'text',
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
  timestamps: true,
}

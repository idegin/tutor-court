import type { CollectionConfig, FieldAccess } from 'payload'

// SECURITY NOTE: generatedPassword is stored for the parent-onboarding UX
// (parents must hand credentials to the child once). It is read-protected so
// only the parent who owns the record or an admin can read it. Treat this as
// technical debt — migrate to a one-time reveal + password-reset flow.
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
        update: parentOrAdminField,
      },
      admin: {
        description:
          'Plaintext for parent hand-off only. Read access restricted to owning parent / admin. Plan: replace with one-time reveal + reset flow.',
      },
    },
    {
      name: 'gradeLevel',
      type: 'select',
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
      name: 'notes',
      type: 'textarea',
    },
  ],
  timestamps: true,
}

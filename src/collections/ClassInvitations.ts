import type { CollectionConfig } from 'payload'

export const ClassInvitations: CollectionConfig = {
  slug: 'class-invitations',
  admin: {
    useAsTitle: 'inviteeEmail',
    defaultColumns: ['inviteeEmail', 'inviteeType', 'status', 'class'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return {
        or: [{ inviter: { equals: user.id } }, { inviteeEmail: { equals: user.email } }],
      } as any
    },
    create: ({ req: { user } }) =>
      Boolean(user && (user.accountType === 'tutor' || user.accountType === 'admin')),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return {
        or: [{ inviter: { equals: user.id } }, { inviteeEmail: { equals: user.email } }],
      } as any
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { inviter: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'class',
      type: 'relationship',
      relationTo: 'classes',
      required: true,
      index: true,
    },
    {
      name: 'inviter',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'inviteeEmail',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'inviteeType',
      type: 'select',
      required: true,
      options: [
        { label: 'Parent', value: 'parent' },
        { label: 'Student', value: 'student' },
      ],
    },
    {
      name: 'token',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Declined', value: 'declined' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    {
      name: 'acceptedBy',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'expiresAt',
      type: 'date',
    },
  ],
  timestamps: true,
}

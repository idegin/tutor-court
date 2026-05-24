import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

const DEFAULT_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export const ClassInvitations: CollectionConfig = {
  slug: 'class-invitations',
  admin: {
    useAsTitle: 'inviteeEmail',
    defaultColumns: ['inviteeEmail', 'inviteeType', 'status', 'class', 'expiresAt'],
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (!data) return data
        if (operation === 'create') {
          if (!data.token) data.token = crypto.randomBytes(24).toString('hex')
          if (!data.expiresAt) {
            data.expiresAt = new Date(Date.now() + DEFAULT_INVITATION_TTL_MS).toISOString()
          }
        }
        return data
      },
    ],
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
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Declined', value: 'declined' },
        { label: 'Expired', value: 'expired' },
        { label: 'Revoked', value: 'revoked' },
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
      index: true,
    },
  ],
  timestamps: true,
}

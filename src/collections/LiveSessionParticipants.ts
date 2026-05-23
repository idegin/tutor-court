import type { CollectionConfig } from 'payload'

export const LiveSessionParticipants: CollectionConfig = {
  slug: 'live-session-participants',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['liveSession', 'user', 'accountType', 'joinedAt', 'leftAt', 'durationSeconds'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return {
        or: [
          { user: { equals: user.id } },
          {
            // Tutors can read participant records for sessions they host
            'liveSession.tutor': { equals: user.id }
          }
        ]
      } as any
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
  },
  fields: [
    {
      name: 'liveSession',
      type: 'relationship',
      relationTo: 'live-sessions',
      required: true,
      index: true,
    },
    {
      name: 'class',
      type: 'relationship',
      relationTo: 'classes',
      required: true,
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'accountType',
      type: 'select',
      required: true,
      options: [
        { label: 'Tutor', value: 'tutor' },
        { label: 'Student', value: 'student' },
        { label: 'Parent', value: 'parent' },
      ],
    },
    {
      name: 'joinedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'leftAt',
      type: 'date',
    },
    {
      name: 'durationSeconds',
      type: 'number',
      defaultValue: 0,
    },
  ],
  timestamps: true,
}

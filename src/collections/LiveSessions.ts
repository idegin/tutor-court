import type { CollectionConfig } from 'payload'

export const LiveSessions: CollectionConfig = {
  slug: 'live-sessions',
  admin: {
    useAsTitle: 'roomId',
    defaultColumns: ['class', 'tutor', 'status', 'startedAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return {
        or: [{ tutor: { equals: user.id } }, { attendees: { equals: user.id } }],
      } as any
    },
    create: ({ req: { user } }) =>
      Boolean(user && (user.accountType === 'tutor' || user.accountType === 'admin')),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { tutor: { equals: user.id } }
    },
    delete: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data
        if (!data?.class || !data?.scheduledFor) return data
        try {
          const existing = await req.payload.find({
            collection: 'live-sessions',
            where: {
              and: [
                { class: { equals: typeof data.class === 'object' ? data.class.id : data.class } },
                { scheduledFor: { equals: data.scheduledFor } },
                { status: { not_in: ['ended', 'cancelled'] } },
              ],
            },
            limit: 1,
            depth: 0,
            req,
          })
          if (existing.totalDocs > 0) {
            throw new Error(
              'A live session for this class is already scheduled at this exact time.',
            )
          }
        } catch (err: any) {
          if (err?.message?.includes('already scheduled')) throw err
        }
        return data
      },
    ],
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
      name: 'tutor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'roomId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'scheduledFor',
      type: 'date',
      index: true,
    },
    {
      name: 'startedAt',
      type: 'date',
    },
    {
      name: 'endedAt',
      type: 'date',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'scheduled',
      index: true,
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Waiting', value: 'waiting' },
        { label: 'Live', value: 'live' },
        { label: 'Ended', value: 'ended' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      name: 'attendees',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      admin: {
        description:
          'Deprecated: prefer live-session-participants for per-user join/leave records. Kept for backwards compatibility.',
      },
    },
    {
      name: 'showWhiteboard',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'activeWhiteboard',
      type: 'relationship',
      relationTo: 'whiteboards',
    },
    {
      name: 'coinsConsumed',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'durationMinutes',
      type: 'number',
      defaultValue: 0,
    },
  ],
  timestamps: true,
}

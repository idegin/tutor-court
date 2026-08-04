import type { CollectionConfig } from 'payload'

export const LiveSessionParticipants: CollectionConfig = {
  slug: 'live-session-participants',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['liveSession', 'user', 'accountType', 'joinedAt', 'leftAt', 'durationSeconds'],
    description:
      'Per-user join/leave records for a live session. Use this collection (not LiveSessions.attendees) as the source of truth for who attended.',
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        if (operation !== 'create' || !data) return data
        const userId = typeof data.user === 'object' ? data.user?.id : data.user
        const sessionId =
          typeof data.liveSession === 'object' ? data.liveSession?.id : data.liveSession
        if (!userId || !sessionId) return data
        const existing = await req.payload.find({
          collection: 'live-session-participants',
          where: {
            and: [{ liveSession: { equals: sessionId } }, { user: { equals: userId } }],
          },
          limit: 1,
          depth: 0,
          req,
        })
        if (existing.totalDocs > 0) {
          throw new Error('Participant record already exists for this user in this session.')
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
    // Only admins and the hosting tutor may mutate a participant record via the
    // API. Without this, a student could PATCH their own record to role:'host'
    // or clear removed:true after being kicked. The server routes (join/leave/
    // status) update with overrideAccess, so they are unaffected.
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { 'liveSession.tutor': { equals: user.id } } as any
    },
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
      index: true,
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
    // ── Live Classroom v2 ──────────────────────────────────────────────────
    {
      name: 'role',
      type: 'select',
      defaultValue: 'viewer',
      index: true,
      options: [
        { label: 'Host', value: 'host' },
        { label: 'Publisher', value: 'publisher' },
        { label: 'Viewer', value: 'viewer' },
      ],
    },
    {
      name: 'handRaisedAt',
      type: 'date',
    },
    {
      name: 'removed',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Set when the host removes this participant; they may not rejoin.' },
    },
    {
      name: 'removedReason',
      type: 'text',
    },
    {
      name: 'sfuSessionId',
      type: 'text',
      admin: {
        description:
          "This participant's Cloudflare Realtime session handle, bound on first RTC signalling so the server can verify they only act on their own media session.",
      },
    },
  ],
  timestamps: true,
}

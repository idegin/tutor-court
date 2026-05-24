import type { CollectionConfig } from 'payload'

export const Attendance: CollectionConfig = {
  slug: 'attendance',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['student', 'class', 'liveSession', 'joinedAt', 'durationMinutes', 'status'],
    description:
      'Aggregated attendance record per (liveSession, student). LiveSessionParticipants holds raw join/leave events; this collection is the rolled-up summary used for parent/tutor reports.',
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create' || !data) return data
        const studentId = typeof data.student === 'object' ? data.student?.id : data.student
        const sessionId =
          typeof data.liveSession === 'object' ? data.liveSession?.id : data.liveSession
        if (!studentId || !sessionId) return data
        const existing = await req.payload.find({
          collection: 'attendance',
          where: {
            and: [{ liveSession: { equals: sessionId } }, { student: { equals: studentId } }],
          },
          limit: 1,
          depth: 0,
          req,
        })
        if (existing.totalDocs > 0) {
          throw new Error('Attendance record already exists for this student in this session.')
        }
        return data
      },
    ],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      if (user.accountType === 'student') {
        return { student: { equals: user.id } } as any
      }
      if (user.accountType === 'parent') {
        return { parent: { equals: user.id } } as any
      }
      if (user.accountType === 'tutor') {
        return { tutor: { equals: user.id } } as any
      }
      return false
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user?.accountType === 'admin' || user?.accountType === 'tutor'),
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
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'tutor',
      type: 'relationship',
      relationTo: 'users',
      index: true,
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
      name: 'durationMinutes',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'present',
      index: true,
      options: [
        { label: 'Present', value: 'present' },
        { label: 'Late', value: 'late' },
        { label: 'Left Early', value: 'left-early' },
        { label: 'Absent', value: 'absent' },
      ],
    },
  ],
  timestamps: true,
}

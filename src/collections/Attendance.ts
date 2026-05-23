import type { CollectionConfig } from 'payload'

export const Attendance: CollectionConfig = {
  slug: 'attendance',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['student', 'class', 'liveSession', 'joinedAt', 'durationMinutes'],
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
    },
    {
      name: 'leftAt',
      type: 'date',
    },
    {
      name: 'durationMinutes',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'present',
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

import type { CollectionConfig } from 'payload'
import { NIGERIAN_GRADES } from '../lib/constants'

export const Classes: CollectionConfig = {
  slug: 'classes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'tutor', 'classType', 'status', 'startDate'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return {
        or: [
          { tutor: { equals: user.id } },
          { students: { equals: user.id } },
          { parents: { equals: user.id } },
        ],
      } as any
    },
    create: ({ req: { user } }) =>
      Boolean(user && (user.accountType === 'tutor' || user.accountType === 'admin')),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { tutor: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { tutor: { equals: user.id } }
    },
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if (data && data.subject) {
          try {
            const subjectDoc = await req.payload.findByID({
              collection: 'subjects',
              id: typeof data.subject === 'object' ? data.subject.id : data.subject,
              depth: 0,
              req,
            })
            if (subjectDoc) {
              data.title = subjectDoc.name
            }
          } catch (error) {
            console.error('Error in Classes beforeChange hook:', error)
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'tutor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
      required: false,
    },
    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      required: true,
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'classType',
      type: 'select',
      required: true,
      defaultValue: 'one-on-one',
      options: [
        { label: 'One-on-One', value: 'one-on-one' },
        { label: 'Group', value: 'group' },
      ],
    },
    {
      name: 'gradeLevel',
      type: 'select',
      required: true,
      options: NIGERIAN_GRADES as any,
      defaultValue: 'grade_1',
      index: true,
    },
    {
      name: 'timezone',
      type: 'text',
      required: true,
      defaultValue: 'Africa/Lagos',
      admin: {
        description: 'IANA timezone used to interpret schedule start/end times.',
      },
    },
    {
      name: 'maxStudents',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 100,
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
    },
    {
      name: 'schedule',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Day', plural: 'Days' },
      fields: [
        {
          name: 'day',
          type: 'select',
          required: true,
          options: [
            { label: 'Monday', value: 'monday' },
            { label: 'Tuesday', value: 'tuesday' },
            { label: 'Wednesday', value: 'wednesday' },
            { label: 'Thursday', value: 'thursday' },
            { label: 'Friday', value: 'friday' },
            { label: 'Saturday', value: 'saturday' },
            { label: 'Sunday', value: 'sunday' },
          ],
        },
        {
          name: 'startTime',
          type: 'text',
          required: true,
          validate: (value: any) => {
            if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
              return 'Time must be in 24-hour HH:MM format (e.g. 09:30, 14:00).'
            }
            return true
          },
          admin: { description: '24-hour HH:MM format, interpreted in the class timezone.' },
        },
        {
          name: 'endTime',
          type: 'text',
          required: true,
          validate: (value: any) => {
            if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
              return 'Time must be in 24-hour HH:MM format (e.g. 09:30, 14:00).'
            }
            return true
          },
          admin: { description: '24-hour HH:MM format, interpreted in the class timezone.' },
        },
      ],
    },
    {
      name: 'students',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
    },
    {
      name: 'parents',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'scheduled',
      index: true,
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      name: 'whiteboard',
      type: 'relationship',
      relationTo: 'whiteboards',
      hasMany: false,
    },
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
      hasMany: false,
      index: true,
      admin: {
        description:
          'The marketplace booking this class was generated from (empty for tutor-created SaaS classes).',
      },
    },
  ],
  timestamps: true,
}

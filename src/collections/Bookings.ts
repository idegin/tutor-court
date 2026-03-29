import type { CollectionConfig } from 'payload'

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['tutor', 'student', 'status', 'date'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user?.accountType === 'admin') return true
      return {
        or: [{ student: { equals: user?.id } }, { 'tutor.user': { equals: user?.id } }],
      } as any
    },
  },
  fields: [
    {
      name: 'tutor',
      type: 'relationship',
      relationTo: 'tutor-profiles',
      required: true,
      hasMany: false,
    },
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      required: true,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'Start date of the engagement',
      },
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'End date of the engagement',
      },
    },
    {
      name: 'hoursPerDay',
      type: 'number',
      required: true,
      defaultValue: 1,
      min: 1,
    },
    {
      name: 'daysOfWeek',
      type: 'select',
      hasMany: true,
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
      name: 'subjects',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'subject',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      admin: {
        description: 'Total price for this booking',
      },
    },
    {
      name: 'message',
      type: 'textarea',
      admin: {
        description: 'Message from the student to the tutor',
      },
    },
  ],
  timestamps: true,
}

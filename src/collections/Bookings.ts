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
    create: ({ req: { user } }) =>
      Boolean(user && (user.accountType === 'student' || user.accountType === 'parent' || user.accountType === 'admin')),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return {
        or: [{ student: { equals: user.id } }, { 'tutor.user': { equals: user.id } }],
      } as any
    },
    delete: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
  },
  fields: [
    {
      name: 'tutor',
      type: 'relationship',
      relationTo: 'tutor-profiles',
      required: true,
      hasMany: false,
      index: true,
    },
    {
      name: 'student',
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
      required: false,
      hasMany: false,
      index: true,
      admin: {
        description: 'Parent user when the booking is made on behalf of a managed student.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Refunded', value: 'refunded' },
      ],
      required: true,
      index: true,
    },
    {
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'unpaid',
      options: [
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Held in Escrow', value: 'held' },
        { label: 'Paid Out', value: 'paid' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Failed', value: 'failed' },
      ],
      required: true,
      index: true,
    },
    {
      name: 'transaction',
      type: 'relationship',
      relationTo: 'transactions',
      hasMany: false,
      admin: {
        description: 'Linked transaction that paid for this booking.',
      },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      index: true,
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
      type: 'relationship',
      relationTo: 'subjects',
      hasMany: true,
      required: true,
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
      admin: { description: "Student's K-12 grade level at time of booking." },
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Total price for this booking',
      },
    },
    {
      name: 'currency',
      type: 'select',
      options: [
        { label: 'NGN', value: 'ngn' },
        { label: 'USD', value: 'usd' },
      ],
      defaultValue: 'ngn',
      required: true,
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

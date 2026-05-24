import type { CollectionConfig } from 'payload'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['recipient', 'type', 'title', 'isRead', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { recipient: { equals: user.id } }
    },
    create: () => true, // Created by server-side services only
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { recipient: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { recipient: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        description: 'User that triggered this notification (optional).',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Student Joined Class', value: 'student_joined_class' },
        { label: 'Parent Accepted Invite', value: 'parent_accepted_invite' },
        { label: 'Student Added to Class', value: 'student_added_to_class' },
        { label: 'Assessment Completed', value: 'assessment_completed' },
        { label: 'Assessment Sent', value: 'assessment_sent' },
        { label: 'New Booking', value: 'new_booking' },
        { label: 'Class Reminder', value: 'class_reminder' },
        { label: 'Payment Received', value: 'payment_received' },
        { label: 'General', value: 'general' },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'seenAt',
      type: 'date',
      admin: {
        description: 'When the notification was surfaced/viewed (badge cleared). Distinct from isRead which is set when opened.',
      },
    },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Normal', value: 'normal' },
        { label: 'High', value: 'high' },
      ],
    },
    {
      name: 'link',
      type: 'text',
      admin: {
        description: 'Optional URL to redirect to when notification is clicked',
      },
    },
    {
      // Optional: link to the related entity (class, assessment, etc.)
      name: 'relatedEntity',
      type: 'group',
      fields: [
        {
          name: 'collection',
          type: 'text',
        },
        {
          name: 'id',
          type: 'text',
        },
      ],
    },
  ],
  timestamps: true,
}

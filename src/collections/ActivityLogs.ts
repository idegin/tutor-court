import type { CollectionConfig } from 'payload'

/**
 * ActivityLogs — append-only audit feed for user-visible activity.
 *
 * Each row represents one entry from a subject's perspective. For events
 * involving two parties (e.g. a student joining a tutor's class) the
 * activity-log service writes one row per perspective, so each role's feed
 * — and the parent's view of their child — sees the event without joins.
 */
export const ActivityLogs: CollectionConfig = {
  slug: 'activity-logs',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['subject', 'type', 'title', 'createdAt'],
    description:
      'Per-user activity feed. Subject is the user whose timeline this row belongs to; actor is who triggered it.',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      if (user.accountType === 'parent') {
        return {
          or: [{ subject: { equals: user.id } }, { 'subject.parent': { equals: user.id } }],
        } as any
      }
      return { subject: { equals: user.id } } as any
    },
    // Writes are server-side only via the activity-log service.
    create: () => true,
    update: ({ req: { user } }) => user?.accountType === 'admin',
    delete: ({ req: { user } }) => user?.accountType === 'admin',
  },
  fields: [
    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description:
          'Whose activity feed this row belongs to. A parent reading a child sees rows where subject = child.',
      },
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'User who triggered the event (may equal subject).',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Assessment Assigned', value: 'assessment_assigned' },
        { label: 'Assessment Completed', value: 'assessment_completed' },
        { label: 'Class Joined', value: 'class_joined' },
        { label: 'Class Left', value: 'class_left' },
        { label: 'Class Ended', value: 'class_ended' },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'link',
      type: 'text',
      admin: { description: 'In-app deep-link the activity row should navigate to.' },
    },
    {
      name: 'relatedCollection',
      type: 'text',
      index: true,
    },
    {
      name: 'relatedId',
      type: 'text',
      index: true,
    },
    {
      name: 'metadata',
      type: 'json',
      admin: { description: 'Arbitrary structured payload — score, duration, etc.' },
    },
  ],
  timestamps: true,
}

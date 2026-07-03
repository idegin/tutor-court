import type { CollectionConfig } from 'payload'

/**
 * Chat messages for a live class. This replaces the previous VideoSDK pubSub
 * chat (which failed to send at all — persisted publishes were rejected and the
 * message never left the browser). Chat now rides on our own backend and is
 * delivered to participants by the same short-interval polling the classroom
 * already runs for session status.
 */
export const LiveSessionMessages: CollectionConfig = {
  slug: 'live-session-messages',
  admin: {
    useAsTitle: 'message',
    defaultColumns: ['liveSession', 'senderName', 'message', 'createdAt'],
    description: 'Chat messages posted during a live class session.',
  },
  access: {
    // Direct REST/admin reads: admin, the hosting tutor, or the sender. The
    // /chat route uses the local API (which bypasses these) and enforces
    // enrollment itself, so students still read their class chat through it.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return {
        or: [{ sender: { equals: user.id } }, { 'liveSession.tutor': { equals: user.id } }],
      } as any
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
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
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      // Denormalized display name captured at send time so the classroom can
      // render the author without a second lookup per message.
      name: 'senderName',
      type: 'text',
      required: true,
    },
    {
      name: 'senderAccountType',
      type: 'select',
      options: [
        { label: 'Tutor', value: 'tutor' },
        { label: 'Student', value: 'student' },
        { label: 'Parent', value: 'parent' },
        { label: 'Admin', value: 'admin' },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
  ],
  timestamps: true,
}

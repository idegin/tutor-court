import type { CollectionConfig } from 'payload'

export const Assessments: CollectionConfig = {
  slug: 'assessments',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'subject', 'tutor', 'type', 'questionCount'],
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
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
  fields: [
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
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
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
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'quiz',
      options: [
        { label: 'Quiz', value: 'quiz' },
        { label: 'Flashcard', value: 'flashcard' },
        { label: 'Practice Test', value: 'practice_test' },
        { label: 'Homework', value: 'homework' },
      ],
    },
    {
      name: 'timeLimitMinutes',
      type: 'number',
      admin: {
        description: 'Optional time limit in minutes (0 = no limit)',
      },
      defaultValue: 0,
    },
    {
      name: 'maxQuestions',
      type: 'number',
      defaultValue: 100,
      admin: {
        description: 'Max questions (up to 100)',
      },
    },
    {
      name: 'passingScore',
      type: 'number',
      defaultValue: 70,
      admin: {
        description: 'Passing score percentage (0-100)',
      },
    },
    {
      name: 'isPublished',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  timestamps: true,
}

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
      index: true,
      options: [
        { label: 'Quiz', value: 'quiz' },
        { label: 'Flashcard', value: 'flashcard' },
        { label: 'Practice Test', value: 'practice_test' },
        { label: 'Homework', value: 'homework' },
      ],
    },
    {
      name: 'gradeLevel',
      type: 'select',
      index: true,
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
      admin: { description: 'Target K-12 grade level for this assessment.' },
    },
    {
      name: 'instructions',
      type: 'textarea',
      admin: { description: 'Instructions shown to the student before they begin.' },
    },
    {
      name: 'timeLimitMinutes',
      type: 'number',
      min: 0,
      max: 600,
      defaultValue: 0,
      admin: {
        description: 'Optional time limit in minutes (0 = no limit, max 600).',
      },
    },
    {
      name: 'maxQuestions',
      type: 'number',
      defaultValue: 100,
      min: 1,
      max: 200,
      admin: {
        description: 'Max questions to include (cap of 200).',
      },
    },
    {
      name: 'passingScore',
      type: 'number',
      defaultValue: 70,
      min: 0,
      max: 100,
      admin: {
        description: 'Passing score percentage (0-100).',
      },
    },
    {
      name: 'isPublished',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
  ],
  timestamps: true,
}

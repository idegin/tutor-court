import type { CollectionConfig } from 'payload'

export const AssessmentQuestions: CollectionConfig = {
  slug: 'assessment-questions',
  admin: {
    useAsTitle: 'questionText',
    defaultColumns: ['assessment', 'type', 'points'],
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) =>
      Boolean(user && (user.accountType === 'tutor' || user.accountType === 'admin')),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'assessment',
      type: 'relationship',
      relationTo: 'assessments',
      required: true,
      index: true,
    },
    {
      name: 'questionText',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Supports Markdown syntax',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'single_choice',
      options: [
        { label: 'Single Choice', value: 'single_choice' },
        { label: 'Multiple Choice', value: 'multiple_choice' },
        { label: 'True / False', value: 'true_false' },
      ],
    },
    {
      name: 'options',
      type: 'array',
      minRows: 0,
      maxRows: 8,
      fields: [
        {
          name: 'optionText',
          type: 'text',
          required: true,
        },
        {
          name: 'isCorrect',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
      admin: {
        description: 'For choice-based questions. Mark one or more as correct.',
      },
    },
    {
      name: 'explanation',
      type: 'textarea',
      admin: {
        description: 'Shown after the student answers (optional)',
      },
    },
    {
      name: 'points',
      type: 'number',
      required: true,
      defaultValue: 1,
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      index: true,
    },
  ],
  timestamps: true,
}

import type { CollectionConfig } from 'payload'

/**
 * AssessmentResults – stores a student's answers and computed score
 * for a specific TutorAssessment.
 */
export const AssessmentResults: CollectionConfig = {
  slug: 'assessment-results',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['tutorAssessment', 'student', 'score', 'passed', 'submittedAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      if (user.accountType === 'tutor') return { tutor: { equals: user.id } }
      if (user.accountType === 'student') return { student: { equals: user.id } }
      return false
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      // Students can update until submitted
      return { student: { equals: user.id } }
    },
    delete: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
  },
  fields: [
    {
      name: 'tutorAssessment',
      type: 'relationship',
      relationTo: 'tutor-assessments',
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
      name: 'tutor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'answers',
      type: 'array',
      fields: [
        {
          name: 'question',
          type: 'relationship',
          relationTo: 'assessment-questions',
          required: true,
        },
        {
          // Stores selected option indices or text
          name: 'selectedOptions',
          type: 'array',
          fields: [
            {
              name: 'optionIndex',
              type: 'number',
            },
          ],
        },
        {
          name: 'textAnswer',
          type: 'text',
        },
        {
          name: 'isCorrect',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'pointsEarned',
          type: 'number',
          defaultValue: 0,
        },
      ],
    },
    {
      name: 'totalPoints',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'earnedPoints',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'score',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Score as a percentage (0-100)',
      },
    },
    {
      name: 'passed',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'submittedAt',
      type: 'date',
      index: true,
    },
    {
      name: 'timeTakenSeconds',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'feedback',
      type: 'textarea',
      admin: {
        description: 'Optional tutor feedback on the result',
      },
    },
  ],
  timestamps: true,
}

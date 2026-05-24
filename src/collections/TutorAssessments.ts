import type { CollectionConfig } from 'payload'

/**
 * TutorAssessments – a tutor selects an Assessment and specific questions
 * from it, then sends it to a student of one of their classes.
 */
export const TutorAssessments: CollectionConfig = {
  slug: 'tutor-assessments',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['assessment', 'student', 'class', 'status', 'dueDate'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      if (user.accountType === 'tutor') return { tutor: { equals: user.id } }
      if (user.accountType === 'student') return { student: { equals: user.id } }
      return false
    },
    create: ({ req: { user } }) =>
      Boolean(user && (user.accountType === 'tutor' || user.accountType === 'admin')),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      if (user.accountType === 'tutor') return { tutor: { equals: user.id } }
      // Students can only update status (via API logic)
      if (user.accountType === 'student') return { student: { equals: user.id } }
      return false
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { tutor: { equals: user.id } }
    },
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
      name: 'tutor',
      type: 'relationship',
      relationTo: 'users',
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
      name: 'class',
      type: 'relationship',
      relationTo: 'classes',
      required: true,
      index: true,
    },
    {
      // Curated selection of question IDs from the parent assessment
      name: 'selectedQuestions',
      type: 'relationship',
      relationTo: 'assessment-questions',
      hasMany: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Expired', value: 'expired' },
      ],
      index: true,
    },
    {
      name: 'dueDate',
      type: 'date',
      index: true,
    },
    {
      name: 'maxAttempts',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 10,
      admin: { description: 'How many times the student may submit (1 = single attempt).' },
    },
    {
      name: 'attemptCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        description: 'Number of submissions made so far. Updated server-side.',
        readOnly: true,
      },
    },
    {
      name: 'instructions',
      type: 'textarea',
    },
  ],
  timestamps: true,
}

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
      if (user.accountType === 'parent') return { 'student.parent': { equals: user.id } } as any
      return false
    },
    create: ({ req: { user } }) =>
      Boolean(user && (user.accountType === 'student' || user.accountType === 'admin')),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      if (user.accountType === 'tutor') return { tutor: { equals: user.id } } as any
      // Students may only update their own unsubmitted result (enforced by hook below).
      if (user.accountType === 'student') {
        return {
          and: [{ student: { equals: user.id } }, { submittedAt: { exists: false } }],
        } as any
      }
      return false
    },
    delete: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req, context }) => {
        // Students may never edit their answers once submitted. Tutors (and the
        // manual-grading endpoint, which passes `context.grading`) are allowed to
        // update grading fields after submission.
        if (
          operation === 'update' &&
          originalDoc?.submittedAt &&
          req.user?.accountType === 'student' &&
          !context?.grading
        ) {
          throw new Error('Cannot modify an assessment result after submission.')
        }
        if (operation === 'create' && data) {
          if (!data.attempt) {
            try {
              const taId =
                typeof data.tutorAssessment === 'object'
                  ? data.tutorAssessment?.id
                  : data.tutorAssessment
              const studentId =
                typeof data.student === 'object' ? data.student?.id : data.student
              if (taId && studentId) {
                const prior = await req.payload.find({
                  collection: 'assessment-results',
                  where: {
                    and: [
                      { tutorAssessment: { equals: taId } },
                      { student: { equals: studentId } },
                    ],
                  },
                  limit: 0,
                  depth: 0,
                  req,
                })
                data.attempt = (prior.totalDocs || 0) + 1
              } else {
                data.attempt = 1
              }
            } catch {
              data.attempt = 1
            }
          }
        }
        return data
      },
    ],
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
      name: 'attempt',
      type: 'number',
      defaultValue: 1,
      min: 1,
      admin: {
        description: 'Which attempt this result represents (1-based).',
        readOnly: true,
      },
      index: true,
    },
    {
      name: 'submittedAt',
      type: 'date',
      index: true,
      admin: {
        description: 'Once set, the student can no longer edit answers.',
      },
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
    {
      name: 'pendingManualGrading',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description:
          'True when the result contains short-answer/essay questions that still need to be graded by the tutor.',
      },
    },
  ],
  timestamps: true,
}

import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['firstName', 'lastName', 'email', 'accountType'],
  },
  auth: {
    verify: {
      generateEmailHTML: ({ token, user }) => {
        return `Click <a href="${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/auth/verified-email?token=${token}">here</a> to verify your email.`
      }
    },
    forgotPassword: {
      generateEmailHTML: ({ token, user }) => {
        return `Click <a href="${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/auth/update-password?token=${token}">here</a> to reset your password.`
      }
    }
  },
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (data?.password) {
          data.password = data.password.trim()
        }
        return data
      }
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create' && doc.accountType === 'tutor') {
          await req.payload.create({
            collection: 'tutor-profiles',
            data: {
              user: doc.id,
              isApproved: false,
            },
            req,
          })
        }
      },
    ],
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'accountType',
      type: 'select',
      options: [
        { label: 'Tutor', value: 'tutor' },
        { label: 'Parent', value: 'parent' },
        { label: 'Student', value: 'student' },
      ],
      required: true,
      defaultValue: 'student',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}

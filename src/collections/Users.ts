import type { CollectionConfig } from 'payload'
import { getBaseEmailLayout } from '../lib/email-template'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['firstName', 'lastName', 'email', 'accountType'],
  },
  auth: {
    verify: {
      generateEmailHTML: (args) => {
        const token = args?.token
        const url = `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/auth/verified-email?token=${token}`
        const content = `
          <p class="text">Hi there,</p>
          <p class="text">Welcome to TutorCourt! We're excited to have you on board. Please verify your email address to get started.</p>
          <div class="btn-container">
            <a href="${url}" class="btn">Verify My Email</a>
          </div>
        `
        return getBaseEmailLayout('Verify Your Email', content)
      },
    },
    forgotPassword: {
      generateEmailHTML: (args) => {
        const token = args?.token
        const url = `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/auth/update-password?token=${token}`
        const content = `
          <p class="text">Hi there,</p>
          <p class="text">We received a request to reset your password for your TutorCourt account.</p>
          <div class="btn-container">
            <a href="${url}" class="btn">Reset Password</a>
          </div>
        `
        return getBaseEmailLayout('Reset Your Password', content)
      },
    },
  },
  access: {
    create: () => true, // Allow public signup
    read: () => true,
    update: ({ req: { user } }) => Boolean(user), // Restrict updates to logged-in
    delete: ({ req: { user } }) => Boolean(user), // Restrict deletes to logged-in
  },
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (data?.password) {
          data.password = data.password.trim()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create' && doc.accountType === 'tutor') {
          await req.payload.create({
            collection: 'tutor-profiles',
            data: {
              user: doc.id,
              isApproved: false,
            } as any,
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
        { label: 'Admin', value: 'admin' },
        { label: 'Tutor', value: 'tutor' },
        { label: 'Parent', value: 'parent' },
        { label: 'Student', value: 'student' },
      ],
      required: true,
      defaultValue: 'student',
    },
    {
      name: 'phoneNumber',
      type: 'text',
      required: true,
    },
    {
      name: 'country',
      type: 'text',
      required: false,
    },
    {
      name: 'timezone',
      type: 'text',
      required: false,
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}

import type { CollectionConfig } from 'payload'
import { getBaseEmailLayout, getEmailServerUrl } from '../lib/email-template'
import { sendEmail } from '../lib/email-service'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['firstName', 'lastName', 'email', 'accountType', 'isActive'],
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000, // 15 minutes
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
    verify: {
      generateEmailHTML: (args) => {
        const token = args?.token
        const serverUrl = getEmailServerUrl()
        const url = `${serverUrl}/auth/verified-email?token=${token}`
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
        const serverUrl = getEmailServerUrl()
        const url = `${serverUrl}/auth/update-password?token=${token}`
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
        if (operation !== 'create') return

        if (doc.accountType === 'tutor') {
          await req.payload.create({
            collection: 'tutor-profiles',
            data: {
              user: doc.id,
              isApproved: false,
            } as any,
            overrideAccess: true,
            req,
          })
        }

        const { totalDocs } = await req.payload.find({
          collection: 'wallets',
          where: { user: { equals: doc.id } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })

        if (totalDocs === 0) {
          await req.payload.create({
            collection: 'wallets',
            data: {
              user: doc.id,
              currency: 'ngn',
              balance: 0,
              creditBalance: 0,
            } as any,
            overrideAccess: true,
            req,
          })
        }

        // Auto-accept pending class invitations for this user email
        try {
          const invitations = await req.payload.find({
            collection: 'class-invitations',
            where: {
              and: [
                { inviteeEmail: { equals: doc.email } },
                { status: { equals: 'pending' } },
              ],
            },
            depth: 0,
            req,
          })

          for (const invitation of invitations.docs) {
            const classId = typeof invitation.class === 'object' ? invitation.class?.id : invitation.class
            if (!classId) continue

            const cls = await req.payload.findByID({
              collection: 'classes',
              id: classId,
              depth: 0,
              req,
            })

            if (cls) {
              const fieldKey = invitation.inviteeType === 'student' ? 'students' : 'parents'
              const existingIds = (cls[fieldKey] || []).map((u: any) => typeof u === 'object' ? u.id : u)
              
              if (!existingIds.includes(doc.id)) {
                await req.payload.update({
                  collection: 'classes',
                  id: classId,
                  data: {
                    [fieldKey]: [...existingIds, doc.id],
                  } as any,
                  req,
                })
              }

              await req.payload.update({
                collection: 'class-invitations',
                id: invitation.id,
                data: {
                  status: 'accepted',
                  acceptedBy: doc.id,
                } as any,
                req,
              })

              const tutor = cls.tutor
              const tutorEmail = typeof tutor === 'object' ? tutor?.email : null
              const tutorName = typeof tutor === 'object' ? `${tutor?.firstName} ${tutor?.lastName}` : 'Tutor'

              if (tutorEmail) {
                const inviteeName = `${doc.firstName} ${doc.lastName}`
                const serverUrl = getEmailServerUrl()
                const emailContent = `
                  <p class="text">Hi ${tutorName},</p>
                  <p class="text">Great news! <strong>${inviteeName}</strong> has registered and accepted your invite to join the class <strong>"${cls.title}"</strong> as a <strong>${invitation.inviteeType}</strong>.</p>
                  <div class="btn-container">
                    <a href="${serverUrl}/dashboard/tutor/classes/${cls.id}" class="btn">View Class Details</a>
                  </div>
                `
                const emailHtml = getBaseEmailLayout('Class Invitation Accepted', emailContent)
                sendEmail({
                  to: tutorEmail,
                  subject: `${inviteeName} Accepted Your Invite to ${cls.title}`,
                  html: emailHtml,
                }).catch(err => console.error('[Users hook] Error sending acceptance email to tutor:', err))
              }
            }
          }
        } catch (error) {
          console.error('Error auto-accepting class invitations in afterChange hook:', error)
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
      required: false,
      admin: {
        description: 'Required for tutors and parents. Managed student accounts may not have one.',
      },
      validate: (value: any, { data }: any) => {
        const t = data?.accountType
        if ((t === 'tutor' || t === 'parent' || t === 'admin') && !value) {
          return 'Phone number is required for tutors, parents, and admins.'
        }
        return true
      },
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
    {
      name: 'dateOfBirth',
      type: 'date',
      admin: {
        description: 'Date of birth. Used to determine if parental consent is required (K-12, COPPA).',
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Uncheck to disable account access without deleting the record.',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      index: true,
      admin: {
        description: 'For child/student accounts created by a parent.',
        condition: (data) => data?.accountType === 'student',
      },
    },
    {
      name: 'isManagedAccount',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'True for child accounts created by a parent (auto-generated email and password).',
        condition: (data) => data?.accountType === 'student',
      },
    },
    {
      name: 'parentalConsentGiven',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Required for students under 13 (COPPA). Set when parent registers the child.',
        condition: (data) => data?.accountType === 'student',
      },
    },
    {
      name: 'hasCompletedOnboarding',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'subjectsOfInterest',
      type: 'relationship',
      relationTo: 'subjects',
      hasMany: true,
      admin: {
        description: 'Subjects the student is interested in learning.',
        condition: (data) => data?.accountType === 'student',
      },
    },
    {
      name: 'gradeLevel',
      type: 'select',
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
      admin: {
        description: 'Current K-12 grade level.',
        condition: (data) => data?.accountType === 'student',
      },
    },
    {
      name: 'learningGoals',
      type: 'textarea',
      admin: {
        description: 'What the student hopes to achieve.',
        condition: (data) => data?.accountType === 'student',
      },
    },
  ],
}

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
        if (operation !== 'create') return

        if (doc.accountType === 'tutor') {
          await req.payload.create({
            collection: 'tutor-profiles',
            data: {
              user: doc.id,
              isApproved: false,
            } as any,
            req,
          })
        }

        const { totalDocs } = await req.payload.find({
          collection: 'wallets',
          where: { user: { equals: doc.id } },
          limit: 1,
          depth: 0,
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
                const emailContent = `
                  <p class="text">Hi ${tutorName},</p>
                  <p class="text">Great news! <strong>${inviteeName}</strong> has registered and accepted your invite to join the class <strong>"${cls.title}"</strong> as a <strong>${invitation.inviteeType}</strong>.</p>
                  <div class="btn-container">
                    <a href="${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5021'}/dashboard/tutor/classes/${cls.id}" class="btn">View Class Details</a>
                  </div>
                `
                const emailHtml = getBaseEmailLayout('Class Invitation Accepted', emailContent)
                req.payload.sendEmail({
                  to: tutorEmail,
                  subject: `${inviteeName} Accepted Your Invite to ${cls.title}`,
                  html: emailHtml,
                }).catch(err => console.error('Error sending acceptance email to tutor:', err))
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
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        description: 'For child/student accounts created by a parent.',
      },
    },
    {
      name: 'isManagedAccount',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'True for child accounts created by a parent (auto-generated email and password).',
      },
    },
    {
      name: 'hasCompletedOnboarding',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
}

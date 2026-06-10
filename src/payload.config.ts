import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import type { PayloadEmailAdapter, SendEmailOptions } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { s3Storage } from '@payloadcms/storage-s3'
import { sendEmail as sendZeptoEmail } from './lib/email-service'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { TutorProfiles } from './collections/TutorProfiles'
import { Subjects } from './collections/Subjects'
import { Reviews } from './collections/Reviews'
import { Wallets } from './collections/Wallets'
import { Transactions } from './collections/Transactions'
import { Bookings } from './collections/Bookings'
import { Students } from './collections/Students'
import { Classes } from './collections/Classes'
import { ClassInvitations } from './collections/ClassInvitations'
import { Whiteboards } from './collections/Whiteboards'
import { WhiteboardSlides } from './collections/WhiteboardSlides'
import { LiveSessions } from './collections/LiveSessions'
import { Attendance } from './collections/Attendance'
import { LiveSessionParticipants } from './collections/LiveSessionParticipants'
import { Assessments } from './collections/Assessments'
import { AssessmentQuestions } from './collections/AssessmentQuestions'
import { TutorAssessments } from './collections/TutorAssessments'
import { AssessmentResults } from './collections/AssessmentResults'
import { Notifications } from './collections/Notifications'
import { ActivityLogs } from './collections/ActivityLogs'
import { runProdSeed } from './lib/prod-seed'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

console.log('[payload.config] ZEPTO_MAIL_FROM:', process.env.ZEPTO_MAIL_FROM)
console.log('[payload.config] ZEPTO_MAIL_API_KEY set:', Boolean(process.env.ZEPTO_MAIL_API_KEY))

// Custom Payload email adapter — routes all auth emails (verify, forgot-password)
// through the ZeptoMail SDK instead of SMTP, matching how invite emails are sent.
const zeptoEmailAdapter: PayloadEmailAdapter = () => ({
  name: 'zeptomail-sdk',
  defaultFromAddress: process.env.ZEPTO_MAIL_FROM || 'noreply@idegin.com',
  defaultFromName: 'TutorCourt',
  sendEmail: async (message: SendEmailOptions) => {
    const toField = message.to
    const toList = Array.isArray(toField) ? toField : toField ? [toField] : []
    const to = toList
      .map((entry) => (typeof entry === 'string' ? entry : entry.address))
      .find(Boolean)
    const html =
      (typeof message.html === 'string' ? message.html : message.html?.toString()) ||
      (typeof message.text === 'string' ? message.text : message.text?.toString()) ||
      ''

    if (!to) {
      throw new Error('[payload.config] Email "to" address is required.')
    }
    if (!message.subject) {
      throw new Error('[payload.config] Email "subject" is required.')
    }

    const replyToField = message.replyTo
    const replyToList = Array.isArray(replyToField)
      ? replyToField
      : replyToField
        ? [replyToField]
        : []
    const replyTo = replyToList
      .map((entry) => (typeof entry === 'string' ? entry : entry.address))
      .find(Boolean)
    console.log(
      `[payload.config] Sending auth email via ZeptoMail SDK → ${to} | ${message.subject}`,
    )
    await sendZeptoEmail({ to, subject: message.subject, html, replyTo })
  },
})

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5021'

// Trusted origins for CORS / CSRF — extend via PAYLOAD_ALLOWED_ORIGINS (comma-separated).
const extraOrigins = (process.env.PAYLOAD_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const trustedOrigins = Array.from(new Set([SERVER_URL, ...extraOrigins]))

export default buildConfig({
  onInit: async (payload) => {
    runProdSeed(payload).catch((err) =>
      console.error('[prod-seed] Unhandled error in onInit:', err),
    )
  },
  serverURL: SERVER_URL,
  cors: trustedOrigins,
  csrf: trustedOrigins,
  telemetry: false,
  cookiePrefix: 'tutorcourt',
  admin: {
    user: Users.slug,
    meta: {
      title: 'TutorCourt Admin',
      description: 'TutorCourt K-12 tutoring platform admin',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  email: zeptoEmailAdapter,
  collections: [
    Users,
    Media,
    TutorProfiles,
    Subjects,
    Reviews,
    Wallets,
    Transactions,
    Bookings,
    Students,
    Classes,
    ClassInvitations,
    Whiteboards,
    WhiteboardSlides,
    LiveSessions,
    Attendance,
    LiveSessionParticipants,
    Assessments,
    AssessmentQuestions,
    TutorAssessments,
    AssessmentResults,
    Notifications,
    ActivityLogs,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // GraphQL is not used by the app; disabling its routes shrinks attack surface.
  graphQL: {
    disable: true,
  },
  // Cap upload size to 25 MB (PDFs, slides, identity docs).
  upload: {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
    },
    // In production we never want Payload to auto-mutate the live schema.
    push: true,
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.TIGRIS_STORAGE_BUCKET || 'tutor-court',
      config: {
        credentials: {
          accessKeyId: process.env.TIGRIS_STORAGE_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.TIGRIS_STORAGE_SECRET_ACCESS_KEY || '',
        },
        region: 'auto',
        endpoint: 'https://fly.storage.tigris.dev',
      },
    }),
  ],
  async onInit(payload) {
    try {
      const users = await payload.find({
        collection: 'users',
        limit: 1,
        overrideAccess: true,
      })

      if (users.totalDocs === 0) {
        payload.logger.info('No users found. Running production database seeding...')

        // Create Admin
        await payload.create({
          collection: 'users',
          data: {
            email: 'admin@tutorcourt.com',
            password: 'Superman6625*',
            firstName: 'Super',
            lastName: 'Admin',
            phoneNumber: '+1234567890',
            accountType: 'admin',
            _verified: true,
          },
          disableVerificationEmail: true,
          overrideAccess: true,
        })
        payload.logger.info('Admin account (admin@tutorcourt.com) created successfully.')

        // Create Math and English subjects
        const subjectsToCreate = ['Mathematics', 'English']
        for (const subjectName of subjectsToCreate) {
          const existing = await payload.find({
            collection: 'subjects',
            where: { name: { equals: subjectName } },
            limit: 1,
            overrideAccess: true,
          })
          if (existing.totalDocs === 0) {
            await payload.create({
              collection: 'subjects',
              data: { name: subjectName },
              overrideAccess: true,
            })
            payload.logger.info(`Subject "${subjectName}" created successfully.`)
          }
        }
      }
    } catch (err) {
      payload.logger.error('Error during auto-seeding:', err)
    }
  },
})

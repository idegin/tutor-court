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
import { SubjectCategories } from './collections/SubjectCategories'
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
import { LiveSessionMessages } from './collections/LiveSessionMessages'
import { Assessments } from './collections/Assessments'
import { AssessmentQuestions } from './collections/AssessmentQuestions'
import { TutorAssessments } from './collections/TutorAssessments'
import { AssessmentResults } from './collections/AssessmentResults'
import { Notifications } from './collections/Notifications'
import { ActivityLogs } from './collections/ActivityLogs'

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
    SubjectCategories,
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
    LiveSessionMessages,
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
    // Dev: auto-push schema for fast iteration. Prod: never auto-mutate the live
    // schema — apply versioned migrations via `payload migrate` at deploy time.
    push: process.env.NODE_ENV !== 'production',
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
})

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

console.log('[payload.config] ZEPTO_MAIL_FROM:', process.env.ZEPTO_MAIL_FROM)
console.log('[payload.config] ZEPTO_MAIL_API_KEY set:', Boolean(process.env.ZEPTO_MAIL_API_KEY))

// Custom Payload email adapter — routes all auth emails (verify, forgot-password)
// through the ZeptoMail SDK instead of SMTP, matching how invite emails are sent.
const zeptoEmailAdapter = () => ({
  name: 'zeptomail-sdk',
  defaultFromAddress: process.env.ZEPTO_MAIL_FROM || 'noreply@idegin.com',
  defaultFromName: 'TutorCourt',
  sendEmail: async (message: {
    to: string | string[]
    subject: string
    html?: string
    text?: string
  }) => {
    const to = Array.isArray(message.to) ? message.to[0] : message.to
    const html = message.html || message.text || ''
    console.log(
      `[payload.config] Sending auth email via ZeptoMail SDK → ${to} | ${message.subject}`,
    )
    await sendZeptoEmail({ to, subject: message.subject, html })
  },
})

export default buildConfig({
  admin: {
    user: Users.slug,
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
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: 'tutor-court',
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

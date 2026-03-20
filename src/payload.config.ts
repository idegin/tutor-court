import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import nodemailer from 'nodemailer'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { TutorProfiles } from './collections/TutorProfiles'
import { Subjects } from './collections/Subjects'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const transport = nodemailer.createTransport({
  host: 'smtp.zeptomail.com',
  port: 587,
  auth: {
    user: 'emailapikey',
    pass: process.env.ZEPTO_MAIL_API_KEY,
  },
})

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  email: nodemailerAdapter({
    defaultFromAddress: 'noreply@idegin.com',
    defaultFromName: 'TutorCourt',
    transport,
  }),
  collections: [Users, Media, TutorProfiles, Subjects],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  plugins: [],
})

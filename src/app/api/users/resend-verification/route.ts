import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sendEmail } from '@/lib/email-service'
import { getBaseEmailLayout, getEmailServerUrl } from '@/lib/email-template'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Fetch the raw user record including the hidden _verificationToken field
    const rawUser = await payload.db.findOne({
      collection: 'users',
      where: { email: { equals: email.toLowerCase().trim() } },
      req: undefined as any,
    })

    if (!rawUser) {
      // Return success to avoid leaking whether an email is registered
      return NextResponse.json({ success: true })
    }

    if (rawUser._verified === true) {
      return NextResponse.json({ error: 'This email is already verified. Please log in.' }, { status: 400 })
    }

    const token = rawUser._verificationToken
    if (!token) {
      return NextResponse.json({ error: 'No verification token found. Please sign up again.' }, { status: 400 })
    }

    const serverUrl = getEmailServerUrl(req.headers)
    const verifyUrl = `${serverUrl}/auth/verified-email?token=${token}`
    const content = `
      <p class="text">Hi there,</p>
      <p class="text">Here is a new verification link for your TutorCourt account. Click the button below to verify your email address.</p>
      <div class="btn-container">
        <a href="${verifyUrl}" class="btn">Verify My Email</a>
      </div>
    `
    const html = getBaseEmailLayout('Verify Your Email', content, serverUrl)

    await sendEmail({ to: email, subject: 'Verify your email', html })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[resend-verification]', error?.message)
    return NextResponse.json({ error: 'Failed to send verification email. Please try again later.' }, { status: 500 })
  }
}

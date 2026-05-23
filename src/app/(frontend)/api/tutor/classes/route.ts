import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'
import { getBaseEmailLayout } from '@/lib/email-template'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can create classes.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const {
    subject,
    description,
    classType,
    maxStudents,
    startDate,
    endDate,
    schedule,
    inviteeEmail,
    inviteeType,
  } = body

  if (!subject || !startDate || !endDate || !schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return NextResponse.json({ error: 'Missing required class fields.' }, { status: 400 })
  }

  try {
    // Create class first
    const newClass = await payload.create({
      collection: 'classes',
      data: {
        tutor: user.id,
        subject,
        description,
        classType: classType || 'one-on-one',
        maxStudents: maxStudents ? Number(maxStudents) : 1,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        schedule: schedule.map((s: any) => ({
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        status: 'scheduled',
        students: [],
        parents: [],
      } as any,
    })

    // If invitation details are provided
    if (inviteeEmail && inviteeType) {
      const trimmedEmail = inviteeEmail.trim().toLowerCase()
      // Check if user already exists
      const existingUsers = await payload.find({
        collection: 'users',
        where: { email: { equals: trimmedEmail } },
        limit: 1,
        depth: 0,
      })

      if (existingUsers.docs.length > 0) {
        const inviteUser = existingUsers.docs[0]
        if (inviteUser.accountType === 'student') {
          // Add to students directly
          await payload.update({
            collection: 'classes',
            id: newClass.id,
            data: {
              students: [inviteUser.id],
            } as any,
          })
        } else if (inviteUser.accountType === 'parent') {
          // Add to parents directly
          await payload.update({
            collection: 'classes',
            id: newClass.id,
            data: {
              parents: [inviteUser.id],
            } as any,
          })
        }

        // Send email to existing user
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5021'
        const emailContent = `
          <p class="text">Hi ${inviteUser.firstName || 'there'},</p>
          <p class="text">Tutor <strong>${user.firstName} ${user.lastName}</strong> has added you to their class <strong>"${newClass.title}"</strong>.</p>
          <div class="btn-container">
            <a href="${serverUrl}/dashboard/${inviteUser.accountType}" class="btn">Go to Dashboard</a>
          </div>
        `
        const emailHtml = getBaseEmailLayout('Added to Class', emailContent)
        await payload.sendEmail({
          to: trimmedEmail,
          subject: `Added to Class: ${newClass.title}`,
          html: emailHtml,
        })
      } else {
        // User does not exist, create invitation token and ClassInvitation record
        const token = crypto.randomBytes(32).toString('hex')
        await payload.create({
          collection: 'class-invitations',
          data: {
            class: newClass.id,
            inviter: user.id,
            inviteeEmail: trimmedEmail,
            inviteeType,
            token,
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          } as any,
        })

        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5021'
        const signupUrl = `${serverUrl}/auth/register?token=${token}&email=${encodeURIComponent(trimmedEmail)}&role=${inviteeType}`

        const emailContent = `
          <p class="text">Hello,</p>
          <p class="text">Tutor <strong>${user.firstName} ${user.lastName}</strong> has invited you to join the class <strong>"${newClass.title}"</strong> as a <strong>${inviteeType}</strong>.</p>
          <p class="text">Please register an account to accept the invitation and access the class dashboard.</p>
          <div class="btn-container">
            <a href="${signupUrl}" class="btn font-semibold">Join Class</a>
          </div>
        `
        const emailHtml = getBaseEmailLayout('Class Invitation', emailContent)
        await payload.sendEmail({
          to: trimmedEmail,
          subject: `Class Invitation: ${newClass.title}`,
          html: emailHtml,
        })
      }
    }

    return NextResponse.json({ success: true, classId: newClass.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

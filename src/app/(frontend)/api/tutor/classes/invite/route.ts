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
    return NextResponse.json({ error: 'Only tutors can invite to classes.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { classId, email, inviteeType } = body

  if (!classId || !email || !inviteeType) {
    return NextResponse.json({ error: 'Missing classId, email, or inviteeType.' }, { status: 400 })
  }

  const trimmedEmail = email.trim().toLowerCase()
  if (!['parent', 'student'].includes(inviteeType)) {
    return NextResponse.json({ error: 'Invalid inviteeType.' }, { status: 400 })
  }

  try {
    // Check if class exists and belongs to tutor
    const classDoc = await payload.findByID({
      collection: 'classes',
      id: classId,
      depth: 0,
    })

    if (!classDoc) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const tutorId = typeof classDoc.tutor === 'object' ? (classDoc.tutor as any).id : classDoc.tutor
    if (tutorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to invite to this class.' }, { status: 403 })
    }

    // Check if user already exists
    const existingUsers = await payload.find({
      collection: 'users',
      where: { email: { equals: trimmedEmail } },
      limit: 1,
      depth: 0,
    })

    if (existingUsers.docs.length > 0) {
      const inviteUser = existingUsers.docs[0]
      if (inviteUser.accountType !== inviteeType) {
        return NextResponse.json({
          error: `User exists but is a ${inviteUser.accountType}, not a ${inviteeType}.`,
        }, { status: 400 })
      }

      // Add to class students or parents array
      const fieldKey = inviteeType === 'student' ? 'students' : 'parents'
      const existingIds = (classDoc[fieldKey] || []).map((u: any) => typeof u === 'object' ? u.id : u)
      
      if (existingIds.includes(inviteUser.id)) {
        return NextResponse.json({ error: `User is already in this class.` }, { status: 400 })
      }

      await payload.update({
        collection: 'classes',
        id: classId,
        data: {
          [fieldKey]: [...existingIds, inviteUser.id],
        } as any,
      })

      // Send email to existing user
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5021'
      const emailContent = `
        <p class="text">Hi ${inviteUser.firstName || 'there'},</p>
        <p class="text">Tutor <strong>${user.firstName} ${user.lastName}</strong> has added you to their class <strong>"${classDoc.title || 'Live Class'}"</strong>.</p>
        <div class="btn-container">
          <a href="${serverUrl}/dashboard/${inviteUser.accountType}" class="btn">Go to Dashboard</a>
        </div>
      `
      payload.sendEmail({
        to: trimmedEmail,
        subject: `Added to Class: ${classDoc.title || 'Live Class'}`,
        html: emailHtml,
      }).catch(err => console.error('Error sending email to existing user:', err))

      return NextResponse.json({ success: true, added: true, user: inviteUser })
    } else {
      // User does not exist, create invitation token and ClassInvitation record
      // Check if there is already a pending invitation for this class & email
      const existingInvites = await payload.find({
        collection: 'class-invitations',
        where: {
          and: [
            { class: { equals: classId } },
            { inviteeEmail: { equals: trimmedEmail } },
            { status: { equals: 'pending' } },
          ],
        },
        limit: 1,
        depth: 0,
      })

      if (existingInvites.docs.length > 0) {
        return NextResponse.json({ error: 'A pending invitation already exists for this email.' }, { status: 400 })
      }

      const token = crypto.randomBytes(32).toString('hex')
      const invitation = await payload.create({
        collection: 'class-invitations',
        data: {
          class: classId,
          inviter: user.id,
          inviteeEmail: trimmedEmail,
          inviteeType,
          token,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      })

      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5021'
      const signupUrl = `${serverUrl}/auth/register?token=${token}&email=${encodeURIComponent(trimmedEmail)}&role=${inviteeType}`

      const emailContent = `
        <p class="text">Hello,</p>
        <p class="text">Tutor <strong>${user.firstName} ${user.lastName}</strong> has invited you to join the class <strong>"${classDoc.title || 'Live Class'}"</strong> as a <strong>${inviteeType}</strong>.</p>
        <p class="text">Please register an account to accept the invitation and access the class dashboard.</p>
        <div class="btn-container">
          <a href="${signupUrl}" class="btn font-semibold">Join Class</a>
        </div>
      `
      payload.sendEmail({
        to: trimmedEmail,
        subject: `Class Invitation: ${classDoc.title || 'Live Class'}`,
        html: emailHtml,
      }).catch(err => console.error('Error sending email to invited user:', err))

      return NextResponse.json({ success: true, added: false, invitation })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can delete invitations.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const invitationId = searchParams.get('id')

  if (!invitationId) {
    return NextResponse.json({ error: 'Missing invitation id.' }, { status: 400 })
  }

  try {
    const invite = await payload.findByID({
      collection: 'class-invitations',
      id: invitationId,
      depth: 0,
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 })
    }

    const inviterId = typeof invite.inviter === 'object' ? (invite.inviter as any).id : invite.inviter
    if (inviterId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this invitation.' }, { status: 403 })
    }

    await payload.delete({
      collection: 'class-invitations',
      id: invitationId,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

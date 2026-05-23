import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'
import { getBaseEmailLayout } from '@/lib/email-template'
import { sendEmail } from '@/lib/email-service'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can resend invitations.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { invitationId, email, classId } = body

  try {
    let invitation: any

    if (invitationId) {
      invitation = await payload.findByID({
        collection: 'class-invitations',
        id: invitationId,
        depth: 1,
      })
    } else if (classId && email) {
      const invites = await payload.find({
        collection: 'class-invitations',
        where: {
          class: { equals: classId },
          inviteeEmail: { equals: email.trim().toLowerCase() },
        },
        limit: 1,
        depth: 1,
      })
      if (invites.docs.length > 0) {
        invitation = invites.docs[0]
      }
    }

    // If no existing invitation, and we have classId + email, let's create a new one
    if (!invitation && classId && email) {
      const cls = await payload.findByID({
        collection: 'classes',
        id: classId,
        depth: 0,
      })

      if (!cls || (typeof cls.tutor === 'object' ? cls.tutor.id : cls.tutor) !== user.id) {
        return NextResponse.json({ error: 'Class not found or unauthorized.' }, { status: 404 })
      }

      const token = crypto.randomBytes(32).toString('hex')
      invitation = await payload.create({
        collection: 'class-invitations',
        data: {
          class: classId,
          inviter: user.id,
          inviteeEmail: email.trim().toLowerCase(),
          inviteeType: 'parent',
          token,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        } as any,
      })
    }

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 })
    }

    const inviterId = typeof invitation.inviter === 'object' ? invitation.inviter.id : invitation.inviter
    if (inviterId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const updatedInvite = await payload.update({
      collection: 'class-invitations',
      id: invitation.id,
      data: {
        token,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } as any,
    })

    const classIdVal = typeof invitation.class === 'object' ? invitation.class.id : invitation.class
    const classObj = typeof invitation.class === 'object' ? invitation.class : await payload.findByID({ collection: 'classes', id: classIdVal })

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5021'
    const signupUrl = `${serverUrl}/auth/register?token=${token}&email=${encodeURIComponent(updatedInvite.inviteeEmail)}&role=${updatedInvite.inviteeType}`

    const emailContent = `
      <p class="text">Hello,</p>
      <p class="text">Tutor <strong>${user.firstName} ${user.lastName}</strong> has resent you the invitation to join the class <strong>"${classObj.title}"</strong> as a <strong>${updatedInvite.inviteeType}</strong>.</p>
      <p class="text">Please register an account to accept the invitation and access the class dashboard.</p>
      <div class="btn-container">
        <a href="${signupUrl}" class="btn font-semibold">Join Class</a>
      </div>
    `
    const emailHtml = getBaseEmailLayout(`Resent Class Invitation: ${classObj.title}`, emailContent)
    sendEmail({
      to: updatedInvite.inviteeEmail,
      subject: `Resent Class Invitation: ${classObj.title}`,
      html: emailHtml,
    }).catch(err => console.error('[resend-invite] Error sending email:', err))

    return NextResponse.json({ success: true, invitation: updatedInvite })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

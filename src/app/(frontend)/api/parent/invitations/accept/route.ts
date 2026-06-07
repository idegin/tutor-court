import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getBaseEmailLayout, getEmailServerUrl } from '@/lib/email-template'
import { sendEmail } from '@/lib/email-service'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'parent') {
    return NextResponse.json({ error: 'Only parents can accept invitations.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { invitationId } = body
  if (!invitationId) {
    return NextResponse.json({ error: 'Missing invitationId.' }, { status: 400 })
  }

  try {
    const invitation = await payload.findByID({
      collection: 'class-invitations',
      id: invitationId,
      depth: 1,
    })

    if (!invitation || invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation not found or not pending.' }, { status: 404 })
    }

    if (invitation.inviteeEmail.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Not authorized to accept this invitation.' }, { status: 403 })
    }

    const classId = typeof invitation.class === 'object' ? invitation.class?.id : invitation.class
    if (!classId) {
      return NextResponse.json({ error: 'Associated class not found.' }, { status: 404 })
    }

    const cls = await payload.findByID({
      collection: 'classes',
      id: classId,
      depth: 1,
    })

    if (!cls) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    // Add parent to class
    const currentParents = (cls.parents || []).map((p: any) => typeof p === 'object' ? p.id : p)
    if (!currentParents.includes(user.id)) {
      currentParents.push(user.id)
    }

    await payload.update({
      collection: 'classes',
      id: classId,
      data: {
        parents: currentParents,
      } as any,
    })

    // Update invitation status
    await payload.update({
      collection: 'class-invitations',
      id: invitationId,
      data: {
        status: 'accepted',
        acceptedBy: user.id,
      } as any,
    })

    // Send email notification to tutor
    const tutor = cls.tutor
    const tutorEmail = typeof tutor === 'object' ? tutor?.email : null
    const tutorName = typeof tutor === 'object' ? `${tutor?.firstName} ${tutor?.lastName}` : 'Tutor'

    if (tutorEmail) {
      const serverUrl = getEmailServerUrl(headers)
      const emailContent = `
        <p class="text">Hi ${tutorName},</p>
        <p class="text">Great news! Parent <strong>${user.firstName} ${user.lastName}</strong> has accepted your invitation to join the class <strong>"${cls.title}"</strong>.</p>
        <p class="text">They are now managing their children's enrollment for this class.</p>
        <div class="btn-container">
          <a href="${serverUrl}/dashboard/tutor/classes/${cls.id}" class="btn">View Class Details</a>
        </div>
      `
      const emailHtml = getBaseEmailLayout('Tutor Invitation Accepted', emailContent, serverUrl)
      await sendEmail({
        to: tutorEmail,
        subject: `${user.firstName} ${user.lastName} Accepted Your Class Invitation`,
        html: emailHtml,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

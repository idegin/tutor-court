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

  if (!user || user.accountType !== 'student') {
    return NextResponse.json({ error: 'Only students can accept these invitations.' }, { status: 403 })
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

    if (invitation.inviteeType !== 'student') {
      return NextResponse.json({ error: 'This invitation is not for a student.' }, { status: 400 })
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

    const currentStudents = (cls.students || []).map((s: any) =>
      typeof s === 'object' ? s.id : s,
    )
    if (!currentStudents.includes(user.id)) {
      currentStudents.push(user.id)
    }

    await payload.update({
      collection: 'classes',
      id: classId,
      data: { students: currentStudents } as any,
    })

    await payload.update({
      collection: 'class-invitations',
      id: invitationId,
      data: {
        status: 'accepted',
        acceptedBy: user.id,
      } as any,
    })

    const tutor = cls.tutor
    const tutorEmail = typeof tutor === 'object' ? tutor?.email : null
    const tutorName = typeof tutor === 'object' ? `${tutor?.firstName} ${tutor?.lastName}` : 'Tutor'

    if (tutorEmail) {
      const serverUrl = getEmailServerUrl(headers)
      const studentName = `${user.firstName} ${user.lastName}`
      const emailContent = `
        <p class="text">Hi ${tutorName},</p>
        <p class="text">Great news! Student <strong>${studentName}</strong> has accepted your invitation to join the class <strong>"${cls.title}"</strong>.</p>
        <div class="btn-container">
          <a href="${serverUrl}/dashboard/tutor/classes/${cls.id}" class="btn">View Class Details</a>
        </div>
      `
      const emailHtml = getBaseEmailLayout('Student Invitation Accepted', emailContent, serverUrl)
      sendEmail({
        to: tutorEmail,
        subject: `${studentName} Accepted Your Class Invitation`,
        html: emailHtml,
      }).catch((err) => console.error('[student-accept-invite] Error sending email:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

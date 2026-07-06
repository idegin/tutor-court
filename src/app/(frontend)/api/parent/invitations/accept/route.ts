import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getBaseEmailLayout, getEmailServerUrl } from '@/lib/email-template'
import { sendEmail } from '@/lib/email-service'
import { createNotification } from '@/lib/notification-service'

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

    if (invitation.inviteeType && invitation.inviteeType !== 'parent') {
      return NextResponse.json({ error: 'This invitation is not for a parent account.' }, { status: 400 })
    }

    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      await payload
        .update({
          collection: 'class-invitations',
          id: invitationId,
          data: { status: 'expired' } as any,
          overrideAccess: true,
        })
        .catch(() => {})
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 })
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

    // Optionally enroll a child in the same request so accept + enroll are
    // atomic — the invitation is only marked accepted after enrollment succeeds
    // (so a capacity failure leaves it retryable rather than consumed).
    const studentId = body.studentId
    const currentParents = (cls.parents || []).map((p: any) => (typeof p === 'object' ? p.id : p))
    if (!currentParents.includes(user.id)) currentParents.push(user.id)

    const classUpdate: any = { parents: currentParents }

    if (studentId) {
      const studentDoc = await payload.findByID({ collection: 'students', id: studentId, depth: 0 })
      if (!studentDoc) {
        return NextResponse.json({ error: 'Student profile not found.' }, { status: 404 })
      }
      const ownerId =
        typeof studentDoc.parent === 'object' ? (studentDoc.parent as any).id : studentDoc.parent
      if (ownerId !== user.id) {
        return NextResponse.json({ error: 'You are not authorized to enroll this student.' }, { status: 403 })
      }
      const studentUserId =
        typeof studentDoc.user === 'object' ? (studentDoc.user as any).id : studentDoc.user
      if (!studentUserId) {
        return NextResponse.json({ error: 'Student profile is missing a linked user account.' }, { status: 400 })
      }
      const currentStudents = (cls.students || []).map((s: any) => (typeof s === 'object' ? s.id : s))
      if (!currentStudents.includes(studentUserId)) {
        if (cls.classType === 'one-on-one' && currentStudents.length >= 1) {
          return NextResponse.json({ error: 'One-on-One classes can only have 1 student.' }, { status: 400 })
        }
        if (cls.maxStudents && cls.maxStudents > 0 && currentStudents.length >= cls.maxStudents) {
          return NextResponse.json(
            { error: `Class capacity limit reached. Maximum is ${cls.maxStudents} student(s).` },
            { status: 400 },
          )
        }
        currentStudents.push(studentUserId)
      }
      classUpdate.students = currentStudents
    }

    await payload.update({
      collection: 'classes',
      id: classId,
      data: classUpdate,
      overrideAccess: true,
    })

    // Update invitation status
    await payload.update({
      collection: 'class-invitations',
      id: invitationId,
      data: {
        status: 'accepted',
        acceptedBy: user.id,
      } as any,
      overrideAccess: true,
    })

    // Send email notification to tutor
    const tutor = cls.tutor
    const tutorId = typeof tutor === 'object' ? tutor?.id : tutor
    const tutorEmail = typeof tutor === 'object' ? tutor?.email : null
    const tutorName = typeof tutor === 'object' ? `${tutor?.firstName} ${tutor?.lastName}` : 'Tutor'

    if (tutorId) {
      await createNotification({
        recipientId: String(tutorId),
        type: 'parent_accepted_invite',
        title: 'Invitation accepted',
        message: `${user.firstName} ${user.lastName} accepted your invitation to "${cls.title}".`,
        link: `/dashboard/tutor/classes/${cls.id}`,
        relatedCollection: 'classes',
        relatedId: String(cls.id),
      })
    }

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

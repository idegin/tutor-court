import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getRouteUser } from '@/lib/auth'
import { getBaseEmailLayout, getEmailServerUrl } from '@/lib/email-template'
import { sendEmail } from '@/lib/email-service'

export async function POST(request: Request) {
  const { user, payload } = await getRouteUser()
  const headers = await getHeaders()

  if (!user || user.accountType !== 'parent') {
    return NextResponse.json({ error: 'Only parents can enroll students in classes.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { classId, studentId } = body
  if (!classId || !studentId) {
    return NextResponse.json({ error: 'Missing classId or studentId.' }, { status: 400 })
  }

  try {
    // 1. Fetch Student profile and verify ownership
    const studentDoc = await payload.findByID({
      collection: 'students',
      id: studentId,
      depth: 0,
    })

    if (!studentDoc) {
      return NextResponse.json({ error: 'Student profile not found.' }, { status: 404 })
    }

    const parentId = typeof studentDoc.parent === 'object' ? (studentDoc.parent as any).id : studentDoc.parent
    if (parentId !== user.id) {
      return NextResponse.json({ error: 'You are not authorized to enroll this student.' }, { status: 403 })
    }

    const studentUserId = typeof studentDoc.user === 'object' ? (studentDoc.user as any).id : studentDoc.user
    if (!studentUserId) {
      return NextResponse.json({ error: 'Student profile is missing a linked user account.' }, { status: 400 })
    }

    // 2. Fetch Class and verify parent membership
    const cls = await payload.findByID({
      collection: 'classes',
      id: classId,
      depth: 1,
    })

    if (!cls) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const classParents = (cls.parents || []).map((p: any) => typeof p === 'object' ? p.id : p)
    if (!classParents.includes(user.id)) {
      return NextResponse.json({ error: 'You are not a member of this class.' }, { status: 403 })
    }

    // 3. Check if student is already enrolled
    const currentStudents = (cls.students || []).map((s: any) => typeof s === 'object' ? s.id : s)
    if (currentStudents.includes(studentUserId)) {
      return NextResponse.json({ error: 'Student is already enrolled in this class.' }, { status: 400 })
    }

    // 4. Constraint check: One-on-one class
    if (cls.classType === 'one-on-one' && currentStudents.length >= 1) {
      return NextResponse.json({ error: 'One-on-One classes can only have 1 student.' }, { status: 400 })
    }

    // 5. Constraint check: Class maximum capacity limit
    if (cls.maxStudents && cls.maxStudents > 0 && currentStudents.length >= cls.maxStudents) {
      return NextResponse.json({ error: `Class capacity limit reached. Maximum limit is ${cls.maxStudents} student(s).` }, { status: 400 })
    }

    // 6. Add student and save
    currentStudents.push(studentUserId)
    await payload.update({
      collection: 'classes',
      id: classId,
      data: {
        students: currentStudents,
      } as any,
      overrideAccess: true,
    })

    const serverUrl = getEmailServerUrl(headers)
    const tutor = cls.tutor
    const tutorEmail = typeof tutor === 'object' ? tutor?.email : null
    const tutorName = typeof tutor === 'object' ? `${tutor?.firstName} ${tutor?.lastName}` : 'Tutor'
    const studentName = `${(studentDoc as any).firstName} ${(studentDoc as any).lastName}`.trim()

    // 7. Send email to class tutor
    if (tutorEmail) {
      const emailContent = `
        <p class="text">Hi ${tutorName},</p>
        <p class="text">Parent <strong>${user.firstName} ${user.lastName}</strong> has enrolled their child <strong>${studentName}</strong> in your class <strong>"${cls.title}"</strong>.</p>
        <div class="btn-container">
          <a href="${serverUrl}/dashboard/tutor/classes/${cls.id}" class="btn">View Class Details</a>
        </div>
      `
      const emailHtml = getBaseEmailLayout('New Student Enrolled', emailContent, serverUrl)
      await sendEmail({
        to: tutorEmail,
        subject: `New Student Enrolled in ${cls.title}`,
        html: emailHtml,
      }).catch((err) => console.error('[enroll] failed to email tutor:', err))
    }

    // Confirmation to the parent.
    const parentConfirmHtml = `
      <p class="text">Hi ${user.firstName},</p>
      <p class="text">You've successfully enrolled <strong>${studentName}</strong> in the class <strong>"${cls.title}"</strong>. Your tutor will be in touch with session details.</p>
      <div class="btn-container">
        <a href="${serverUrl}/dashboard/parent/classes/${cls.id}" class="btn">View Class</a>
      </div>
    `
    await sendEmail({
      to: user.email,
      subject: `${studentName} enrolled in "${cls.title}" - TutorCourt`,
      html: getBaseEmailLayout('Student Enrolled', parentConfirmHtml, serverUrl),
    }).catch((err) => console.error('[enroll] failed to email parent:', err))

    // Notify the student if they have a real email (managed accounts may not).
    const studentUser = await payload.findByID({
      collection: 'users',
      id: studentUserId,
      depth: 0,
      overrideAccess: true,
    }).catch(() => null) as any
    if (studentUser?.email && !studentUser.isManagedAccount) {
      const studentConfirmHtml = `
        <p class="text">Hi ${studentUser.firstName},</p>
        <p class="text">Your parent enrolled you in the class <strong>"${cls.title}"</strong>. Your tutor will be in touch with session details.</p>
        <div class="btn-container">
          <a href="${serverUrl}/dashboard/student" class="btn">Go to Dashboard</a>
        </div>
      `
      await sendEmail({
        to: studentUser.email,
        subject: `You've been enrolled in "${cls.title}" - TutorCourt`,
        html: getBaseEmailLayout('Enrolled in Class', studentConfirmHtml, serverUrl),
      }).catch((err) => console.error('[enroll] failed to email student:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

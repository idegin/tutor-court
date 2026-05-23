import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { generateManagedEmail, generateManagedPassword } from '@/lib/managed-account'
import { getBaseEmailLayout } from '@/lib/email-template'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'parent') {
    return NextResponse.json({ error: 'Only parents can add children.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const firstName = (body?.firstName || '').toString().trim()
  const lastName = (body?.lastName || '').toString().trim()
  const gradeLevel = (body?.gradeLevel || '').toString().trim() || undefined
  const notes = (body?.notes || '').toString().trim() || undefined

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: 'First name and last name are required.' },
      { status: 400 },
    )
  }

  const generatedEmail = await generateManagedEmail(payload, firstName, lastName)
  const generatedPassword = generateManagedPassword(12)

  const childUser = await payload.create({
    collection: 'users',
    data: {
      firstName,
      lastName,
      email: generatedEmail,
      password: generatedPassword,
      accountType: 'student',
      phoneNumber: user.phoneNumber || '0000000000',
      parent: user.id,
      isManagedAccount: true,
      hasCompletedOnboarding: true,
      _verified: true,
    } as any,
  })

  const student = await payload.create({
    collection: 'students',
    data: {
      user: childUser.id,
      parent: user.id,
      firstName,
      lastName,
      generatedEmail,
      generatedPassword,
      gradeLevel,
      notes,
    } as any,
  })

  // Handle Class Invitations for this parent
  const invitations = await payload.find({
    collection: 'class-invitations',
    where: {
      and: [
        { inviteeEmail: { equals: user.email } },
        { inviteeType: { equals: 'parent' } },
        { status: { equals: 'pending' } },
      ],
    },
    limit: 50,
  })

  for (const invitation of invitations.docs) {
    const classId = typeof invitation.class === 'object' ? invitation.class?.id : invitation.class
    if (!classId) continue

    const cls = await payload.findByID({
      collection: 'classes',
      id: classId,
      depth: 1,
    })

    if (cls) {
      const currentStudents = (cls.students || []).map((s: any) =>
        typeof s === 'object' ? s.id : s,
      )
      if (!currentStudents.includes(childUser.id)) {
        currentStudents.push(childUser.id)
      }

      const currentParents = (cls.parents || []).map((p: any) =>
        typeof p === 'object' ? p.id : p,
      )
      if (!currentParents.includes(user.id)) {
        currentParents.push(user.id)
      }

      await payload.update({
        collection: 'classes',
        id: classId,
        data: {
          students: currentStudents,
          parents: currentParents,
        } as any,
      })

      await payload.update({
        collection: 'class-invitations',
        id: invitation.id,
        data: {
          status: 'accepted',
          acceptedBy: user.id,
        } as any,
      })

      const tutor = cls.tutor
      const tutorEmail = typeof tutor === 'object' ? tutor?.email : null
      const tutorName =
        typeof tutor === 'object' ? `${tutor?.firstName} ${tutor?.lastName}` : 'Tutor'

      if (tutorEmail) {
        const emailContent = `
          <p class="text">Hi ${tutorName},</p>
          <p class="text">Great news! A parent, <strong>${user.firstName} ${user.lastName}</strong>, has completed onboarding and added their child, <strong>${firstName} ${lastName}</strong>, to your class <strong>"${cls.title}"</strong>.</p>
          <p class="text">You can now view this student in your class details page and start scheduling sessions.</p>
          <div class="btn-container">
            <a href="${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5021'}/dashboard/tutor/classes/${cls.id}" class="btn">View Class Details</a>
          </div>
        `
        const emailHtml = getBaseEmailLayout('Student Added to Your Class', emailContent)
        await payload.sendEmail({
          to: tutorEmail,
          subject: `New Student: ${firstName} ${lastName} Joined ${cls.title}`,
          html: emailHtml,
        })
      }
    }
  }

  // Also check direct classes (where the parent was added directly)
  const directClasses = await payload.find({
    collection: 'classes',
    where: {
      parents: { equals: user.id },
    },
    limit: 50,
  })

  for (const cls of directClasses.docs) {
    const currentStudents = (cls.students || []).map((s: any) =>
      typeof s === 'object' ? s.id : s,
    )
    if (!currentStudents.includes(childUser.id)) {
      currentStudents.push(childUser.id)

      await payload.update({
        collection: 'classes',
        id: cls.id,
        data: {
          students: currentStudents,
        } as any,
      })

      const tutor = cls.tutor
      const tutorEmail = typeof tutor === 'object' ? tutor?.email : null
      const tutorName =
        typeof tutor === 'object' ? `${tutor?.firstName} ${tutor?.lastName}` : 'Tutor'

      if (tutorEmail) {
        const emailContent = `
          <p class="text">Hi ${tutorName},</p>
          <p class="text">Great news! A parent, <strong>${user.firstName} ${user.lastName}</strong>, has added their child, <strong>${firstName} ${lastName}</strong>, to your class <strong>"${cls.title}"</strong>.</p>
          <p class="text">You can now view this student in your class details page and start scheduling sessions.</p>
          <div class="btn-container">
            <a href="${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5021'}/dashboard/tutor/classes/${cls.id}" class="btn">View Class Details</a>
          </div>
        `
        const emailHtml = getBaseEmailLayout('Student Added to Your Class', emailContent)
        await payload.sendEmail({
          to: tutorEmail,
          subject: `New Student: ${firstName} ${lastName} Joined ${cls.title}`,
          html: emailHtml,
        })
      }
    }
  }

  return NextResponse.json({
    student: {
      id: student.id,
      firstName,
      lastName,
      generatedEmail,
      generatedPassword,
      gradeLevel,
    },
  })
}

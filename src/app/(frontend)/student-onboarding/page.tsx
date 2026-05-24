import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'

import { isManagedEmail } from '@/lib/managed-account'
import { StudentOnboardingClient } from './student-onboarding-client'

export const metadata = {
  title: 'Welcome | TutorCourt',
  description: 'Tell us about your learning goals to get started.',
}

export default async function StudentOnboardingPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (user && ((user as any).isManagedAccount || isManagedEmail(user.email))) {
    redirect('/dashboard/student')
  }

  const subjectsResult = await payload.find({
    collection: 'subjects',
    sort: 'name',
    depth: 0,
    limit: 100,
  })

  const pendingInvitesResult = await payload.find({
    collection: 'class-invitations',
    where: {
      and: [
        { inviteeEmail: { equals: user!.email } },
        { status: { equals: 'pending' } },
        { inviteeType: { equals: 'student' } },
      ],
    },
    depth: 2,
    limit: 50,
  })

  const acceptedInvitesResult = await payload.find({
    collection: 'class-invitations',
    where: {
      and: [
        { inviteeEmail: { equals: user!.email } },
        { status: { equals: 'accepted' } },
        { inviteeType: { equals: 'student' } },
      ],
    },
    depth: 2,
    limit: 50,
  })

  const pendingInvitations = pendingInvitesResult.docs.map((inv) => {
    const classDoc = inv.class as any
    const inviterDoc = inv.inviter as any
    return {
      id: String(inv.id),
      className: classDoc?.title || 'Unknown Class',
      classId: String(classDoc?.id || ''),
      tutorName: inviterDoc ? `${inviterDoc.firstName} ${inviterDoc.lastName}` : 'Tutor',
    }
  })

  const enrolledClasses = acceptedInvitesResult.docs.map((inv) => {
    const classDoc = inv.class as any
    const inviterDoc = inv.inviter as any
    return {
      className: classDoc?.title || 'Unknown Class',
      tutorName: inviterDoc ? `${inviterDoc.firstName} ${inviterDoc.lastName}` : 'Tutor',
    }
  })

  const subjects = subjectsResult.docs.map((s) => ({
    id: String(s.id),
    name: s.name as string,
  }))

  return (
    <StudentOnboardingClient
      studentName={`${user!.firstName} ${user!.lastName}`}
      subjects={subjects}
      pendingInvitations={pendingInvitations}
      enrolledClasses={enrolledClasses}
      initialGradeLevel={(user as any)?.gradeLevel || ''}
      initialCountry={(user as any)?.country || ''}
      initialSubjectIds={(((user as any)?.subjectsOfInterest || []) as any[]).map((s: any) =>
        String(typeof s === 'object' ? s.id : s),
      )}
    />
  )
}

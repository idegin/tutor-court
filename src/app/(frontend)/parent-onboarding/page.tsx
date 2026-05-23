import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'

import { ParentOnboardingClient } from './parent-onboarding-client'

export const metadata = {
  title: 'Welcome | TutorCourt',
  description: 'Add your children to get started.',
}

export default async function ParentOnboardingPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const { docs } = await payload.find({
    collection: 'students',
    where: { parent: { equals: user!.id } },
    sort: '-createdAt',
    depth: 0,
    limit: 50,
  })

  const invitesResult = await payload.find({
    collection: 'class-invitations',
    where: {
      and: [
        { inviteeEmail: { equals: user!.email } },
        { status: { equals: 'pending' } },
        { inviteeType: { equals: 'parent' } },
      ],
    },
    depth: 2,
    limit: 50,
  })

  const initialInvitations = invitesResult.docs.map((inv) => {
    const classDoc = inv.class as any
    const inviterDoc = inv.inviter as any
    return {
      id: String(inv.id),
      className: classDoc?.title || 'Unknown Class',
      classId: String(classDoc?.id || ''),
      tutorName: inviterDoc ? `${inviterDoc.firstName} ${inviterDoc.lastName}` : 'Tutor',
    }
  })

  return (
    <ParentOnboardingClient
      parentName={`${user!.firstName} ${user!.lastName}`}
      initialChildren={docs.map((d) => ({
        id: String(d.id),
        firstName: d.firstName as string,
        lastName: d.lastName as string,
        generatedEmail: d.generatedEmail as string,
        generatedPassword: d.generatedPassword as string,
        gradeLevel: (d.gradeLevel as string) || null,
      }))}
      initialInvitations={initialInvitations}
    />
  )
}

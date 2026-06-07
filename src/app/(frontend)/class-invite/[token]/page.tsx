import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { getServerSideUser } from '@/lib/auth'
import { ClassInviteClient } from './class-invite-client'

export const metadata = {
  title: 'Class Invitation | TutorCourt',
  description: 'Join your class on TutorCourt.',
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function ClassInvitePage(props: PageProps) {
  const params = await props.params
  const { token } = params

  const payload = await getPayload({ config })

  // Find the pending invitation
  const invitesResult = await payload.find({
    collection: 'class-invitations',
    where: {
      and: [
        { token: { equals: token } },
        { status: { equals: 'pending' } },
      ],
    },
    depth: 2, // Load class and inviter fully
    limit: 1,
  })

  if (invitesResult.docs.length === 0) {
    // If not pending, check if it's already accepted to show a nicer screen
    const acceptedResult = await payload.find({
      collection: 'class-invitations',
      where: {
        token: { equals: token }
      },
      depth: 2,
      limit: 1,
    })

    if (acceptedResult.docs.length > 0) {
      const invite = acceptedResult.docs[0]
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
          <div className="w-full max-w-md bg-card border border-border shadow-2xl p-8 rounded-2xl text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Invitation Already Accepted</h2>
              <p className="text-sm text-muted-foreground">
                This invitation has already been accepted. You can access the class from your dashboard.
              </p>
            </div>
            <a
              href="/dashboard"
              className="inline-block w-full py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold rounded-lg text-center"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      )
    }

    return notFound()
  }

  const invitation = invitesResult.docs[0]
  const classDoc = invitation.class as any
  const tutorDoc = invitation.inviter as any

  // Get logged in user
  const { user } = await getServerSideUser()

  let parentChildren: any[] = []
  if (user && user.accountType === 'parent') {
    // Fetch parent's children (students collection)
    const childrenRes = await payload.find({
      collection: 'students',
      where: { parent: { equals: user.id } },
      depth: 0,
      limit: 50,
    })
    parentChildren = childrenRes.docs.map(c => ({
      id: String(c.id),
      firstName: c.firstName as string,
      lastName: c.lastName as string,
    }))
  }

  return (
    <ClassInviteClient
      token={token}
      invitationId={String(invitation.id)}
      classId={classDoc?.id ? String(classDoc.id) : ''}
      inviteeEmail={invitation.inviteeEmail}
      inviteeType={invitation.inviteeType}
      classTitle={classDoc?.title || 'Live Class'}
      classDescription={classDoc?.description || ''}
      classSchedule={classDoc?.schedule || []}
      classStartDate={classDoc?.startDate ? new Date(classDoc.startDate).toLocaleDateString() : ''}
      tutorName={tutorDoc ? `${tutorDoc.firstName} ${tutorDoc.lastName}` : 'Tutor'}
      currentUser={user}
      initialChildren={parentChildren}
    />
  )
}

import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { ProgressDashboard } from '@/components/dashboard/progress-dashboard'

export const metadata = {
  title: 'Progress | Parent Dashboard',
}

export default async function ParentProgressPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'parent') {
    redirect('/auth/login')
  }

  // Parents' children are users with accountType 'student' and parent == me.
  const childrenRes = await payload.find({
    collection: 'users',
    where: {
      and: [{ parent: { equals: user.id } }, { accountType: { equals: 'student' } }],
    },
    limit: 200,
    depth: 0,
  })

  const students = childrenRes.docs.map((d: any) => ({
    id: String(d.id),
    name: `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.email || 'Student',
  }))

  return <ProgressDashboard role="parent" students={students} />
}

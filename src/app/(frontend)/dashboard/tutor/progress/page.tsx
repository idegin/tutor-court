import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { ProgressDashboard } from '@/components/dashboard/progress-dashboard'

export const metadata = {
  title: 'Progress | Tutor Dashboard',
}

export default async function TutorProgressPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    redirect('/auth/login')
  }

  // Distinct students enrolled across the tutor's classes (for the filter).
  const classesRes = await payload.find({
    collection: 'classes',
    where: { tutor: { equals: user.id } },
    limit: 200,
    depth: 1,
  })

  const studentMap = new Map<string, string>()
  for (const cls of classesRes.docs as any[]) {
    for (const s of cls.students || []) {
      const id = String(typeof s === 'object' ? s.id : s)
      if (studentMap.has(id)) continue
      const name =
        typeof s === 'object'
          ? `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email || 'Student'
          : 'Student'
      studentMap.set(id, name)
    }
  }

  const students = Array.from(studentMap.entries()).map(([id, name]) => ({ id, name }))

  return <ProgressDashboard role="tutor" students={students} />
}

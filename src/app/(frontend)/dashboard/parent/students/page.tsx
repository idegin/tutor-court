import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { StudentList } from './student-list'

export const metadata = {
  title: 'Students | Parent Dashboard',
}

export default async function ParentStudentsPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const { docs } = await payload.find({
    collection: 'students',
    where: { parent: { equals: user!.id } },
    sort: '-createdAt',
    depth: 0,
    limit: 100,
  })

  const children = docs.map((d: any) => ({
    id: String(d.id),
    firstName: d.firstName as string,
    lastName: d.lastName as string,
    generatedEmail: d.generatedEmail as string,
    generatedPassword: d.generatedPassword as string,
    gradeLevel: (d.gradeLevel as string) || null,
    createdAt: d.createdAt as string,
  }))

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <StudentList initialChildren={children} />
    </div>
  )
}

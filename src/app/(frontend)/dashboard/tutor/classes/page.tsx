import React from 'react'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ClassesClient } from './classes-client'

export const metadata = {
  title: 'Classes | Tutor Dashboard',
}

export default async function TutorClassesPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) return null

  const [classesRes, subjectsRes] = await Promise.all([
    payload.find({
      collection: 'classes',
      where: {
        tutor: { equals: user.id },
      },
      sort: '-createdAt',
      limit: 100,
      depth: 2,
    }),
    payload.find({
      collection: 'subjects',
      sort: 'name',
      limit: 100,
      depth: 0,
    }),
  ])

  return <ClassesClient initialClasses={classesRes.docs} subjects={subjectsRes.docs} />
}

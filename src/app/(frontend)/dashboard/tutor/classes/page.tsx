import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'
import { ClassesClient } from './classes-client'

export const metadata = {
  title: 'Classes | Tutor Dashboard',
}

export default async function TutorClassesPage() {
  const { user, tutorProfile, dependencies } = await getServerSideUser()

  if (!user) return null

  const payload = await getPayload({ config })

  const classesRes = await payload.find({
    collection: 'classes',
    where: { tutor: { equals: user.id } },
    sort: '-createdAt',
    limit: 100,
    depth: 2,
  })

  return (
    <ClassesClient
      initialClasses={classesRes.docs}
      subjects={dependencies.subjects}
      onboardingCompleted={tutorProfile?.onboardingCompleted ?? false}
    />
  )
}

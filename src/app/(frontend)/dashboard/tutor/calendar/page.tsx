import React from 'react'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'
import { DashboardCalendar } from '@/components/dashboard/dashboard-calendar'
import { generateRecurringEvents } from '@/lib/calendar-events'

export const metadata = {
  title: 'Calendar | Tutor Dashboard',
  description: 'Manage your tutoring schedule',
}

export default async function TutorCalendarPage() {
  const { user, tutorProfile } = await getServerSideUser()

  if (!user || user.accountType !== 'tutor') {
    redirect('/auth/login')
  }

  const payload = await getPayload({ config })

  const classesRes = await payload.find({
    collection: 'classes',
    where: { tutor: { equals: user.id } },
    limit: 100,
    depth: 2,
  })

  const classesWithStudents = classesRes.docs.filter(
    (cls) => Array.isArray(cls.students) && cls.students.length > 0
  )

  const tutorName = `${user.firstName} ${user.lastName}`
  const events = generateRecurringEvents(classesWithStudents, {
    role: 'tutor',
    viewerTutorName: tutorName,
  })

  return (
    <DashboardCalendar
      userRole="tutor"
      initialEvents={events}
      onboardingCompleted={tutorProfile?.onboardingCompleted ?? false}
    />
  )
}
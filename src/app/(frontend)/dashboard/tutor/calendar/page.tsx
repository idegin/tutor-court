import React from 'react'
import { redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DashboardCalendar } from '@/components/dashboard/dashboard-calendar'
import { generateRecurringEvents } from '@/lib/calendar-events'

export const metadata = {
  title: 'Calendar | Tutor Dashboard',
  description: 'Manage your tutoring schedule',
}

export default async function TutorCalendarPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    redirect('/auth/login')
  }

  const classesRes = await payload.find({
    collection: 'classes',
    where: {
      tutor: { equals: user.id },
    },
    limit: 100,
    depth: 2,
  })

  // Only show classes that have students in them
  const classesWithStudents = classesRes.docs.filter(
    (cls) => Array.isArray(cls.students) && cls.students.length > 0
  )

  const tutorName = `${user.firstName} ${user.lastName}`
  const events = generateRecurringEvents(classesWithStudents, {
    role: 'tutor',
    viewerTutorName: tutorName,
  })

  return <DashboardCalendar userRole="tutor" initialEvents={events} />
}
import React from 'react'
import { redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DashboardCalendar } from '@/components/dashboard/dashboard-calendar'
import { generateRecurringEvents } from '@/lib/calendar-events'

export const metadata = {
  title: 'Calendar | Parent Dashboard',
  description: 'View schedule of classes for your children',
}

export default async function ParentCalendarPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'parent') {
    redirect('/auth/login')
  }

  const classesRes = await payload.find({
    collection: 'classes',
    where: {
      parents: { equals: user.id },
    },
    limit: 100,
    depth: 2,
  })

  const events = generateRecurringEvents(classesRes.docs, { role: 'parent' })

  return <DashboardCalendar userRole="parent" initialEvents={events} />
}

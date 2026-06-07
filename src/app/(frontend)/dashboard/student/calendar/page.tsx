import React from 'react'
import { redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DashboardCalendar } from '@/components/dashboard/dashboard-calendar'

export const metadata = {
  title: 'Calendar | Student Dashboard',
  description: 'View your scheduled tutoring classes',
}

function generateRecurringEvents(classes: any[]) {
  const events: any[] = []

  const dayIndexMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  for (const cls of classes) {
    const start = new Date(cls.startDate)
    const end = new Date(cls.endDate)
    const schedule = cls.schedule || []

    for (const item of schedule) {
      const targetDay = dayIndexMap[item.day.toLowerCase()]
      if (targetDay === undefined) continue

      const [startH, startM] = item.startTime.split(':').map(Number)
      const [endH, endM] = item.endTime.split(':').map(Number)

      const current = new Date(start)
      while (current <= end) {
        if (current.getDay() === targetDay) {
          const eventStart = new Date(current)
          eventStart.setHours(startH, startM, 0, 0)

          const eventEnd = new Date(current)
          eventEnd.setHours(endH, endM, 0, 0)

          const tutorName =
            cls.tutor && typeof cls.tutor === 'object'
              ? `${cls.tutor.firstName} ${cls.tutor.lastName}`
              : 'Tutor'

          const subjectName = typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')
          
          events.push({
            id: `${cls.id}-${current.toISOString().slice(0, 10)}`,
            classId: cls.id,
            title: `${subjectName} with ${tutorName}`,
            subject: subjectName,
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
            student: 'You',
            tutorName,
            status: cls.status === 'active' ? 'confirmed' : 'pending',
            description: cls.description,
            scheduleText: `${item.day.charAt(0).toUpperCase() + item.day.slice(1)} (${item.startTime} - ${item.endTime})`,
          })
        }
        current.setDate(current.getDate() + 1)
      }
    }
  }

  return events
}

export default async function StudentCalendarPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'student') {
    redirect('/auth/login')
  }

  const classesRes = await payload.find({
    collection: 'classes',
    where: {
      students: { contains: user.id },
    },
    limit: 100,
    depth: 2,
  })

  const classesWithStudents = classesRes.docs.filter(
    (cls) => Array.isArray(cls.students) && cls.students.length > 0
  )

  const events = generateRecurringEvents(classesWithStudents)

  return <DashboardCalendar userRole="student" initialEvents={events} />
}

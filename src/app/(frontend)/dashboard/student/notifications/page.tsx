import React from 'react'
import { NotificationsList } from '@/components/dashboard/notifications-list'

export const metadata = {
  title: 'Notifications | Student Dashboard',
  description: 'View your class updates, reminders, and performance grades',
}

export default function StudentNotificationsPage() {
  return <NotificationsList userRole="student" />
}

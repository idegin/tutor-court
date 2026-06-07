import React from 'react'
import { NotificationsList } from '@/components/dashboard/notifications-list'

export const metadata = {
  title: 'Notifications | Tutor Dashboard',
  description: 'View your in-app notifications and updates',
}

export default function TutorNotificationsPage() {
  return <NotificationsList userRole="tutor" />
}

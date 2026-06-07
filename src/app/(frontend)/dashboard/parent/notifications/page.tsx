import React from 'react'
import { NotificationsList } from '@/components/dashboard/notifications-list'

export const metadata = {
  title: 'Notifications | Parent Dashboard',
  description: 'View notifications about your child\'s learning and schedules',
}

export default function ParentNotificationsPage() {
  return <NotificationsList userRole="parent" />
}

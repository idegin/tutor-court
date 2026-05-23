import { redirect } from 'next/navigation'
import React from 'react'

import { getServerSideUser } from '@/lib/auth'
import { StudentShell } from './student-shell'

export default async function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await getServerSideUser()

  if (!user) {
    redirect('/auth/login?redirect=/dashboard/student')
  }

  if (user.accountType !== 'student') {
    redirect(`/dashboard/${user.accountType}`)
  }

  return <StudentShell>{children}</StudentShell>
}

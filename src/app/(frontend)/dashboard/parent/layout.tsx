import { redirect } from 'next/navigation'
import React from 'react'

import { getServerSideUser } from '@/lib/auth'
import { ParentShell } from './parent-shell'

export default async function ParentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await getServerSideUser()

  if (!user) {
    redirect('/auth/login?redirect=/dashboard/parent')
  }

  if (user.accountType !== 'parent') {
    redirect(`/dashboard/${user.accountType}`)
  }

  if (!user.hasCompletedOnboarding) {
    redirect('/parent-onboarding')
  }

  return <ParentShell>{children}</ParentShell>
}

import { redirect } from 'next/navigation'
import React from 'react'

import { getServerSideUser } from '@/lib/auth'

export default async function ParentOnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await getServerSideUser()

  if (!user) {
    redirect('/auth/login?redirect=/parent-onboarding')
  }

  if (user.accountType !== 'parent') {
    redirect(`/dashboard/${user.accountType}`)
  }

  if (user.hasCompletedOnboarding) {
    redirect('/dashboard/parent')
  }

  return <>{children}</>
}

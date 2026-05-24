import { redirect } from 'next/navigation'
import React from 'react'

import { getServerSideUser } from '@/lib/auth'

export default async function StudentOnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await getServerSideUser()

  if (!user) {
    redirect('/auth/login?redirect=/student-onboarding')
  }

  if (user.accountType !== 'student') {
    redirect(`/dashboard/${user.accountType}`)
  }

  if (user.hasCompletedOnboarding) {
    redirect('/dashboard/student')
  }

  return <>{children}</>
}

import { redirect } from 'next/navigation'

import { getServerSideUser } from '@/lib/auth'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export const metadata = {
  title: 'Settings | Student Dashboard',
}

export default async function StudentSettingsPage() {
  const { user } = await getServerSideUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <ComingSoon
      feature="Settings"
      description="Account settings for students are coming soon — you'll be able to manage your preferences here."
      backHref="/dashboard/student"
    />
  )
}

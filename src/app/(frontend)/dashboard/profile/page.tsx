import { redirect } from 'next/navigation'

import { getServerSideUser } from '@/lib/auth'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export const metadata = {
  title: 'Profile | TutorCourt',
}

export default async function ProfilePage() {
  const { user } = await getServerSideUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <ComingSoon
      feature="Profile"
      description="Your profile page is coming soon — you'll be able to view and update your personal details here."
      backHref={`/dashboard/${user.accountType}`}
    />
  )
}

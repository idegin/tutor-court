import Link from 'next/link'
import { HiOutlineVideoCameraSlash, HiOutlineArrowLeft } from 'react-icons/hi2'

import { Button } from '@/components/ui/button'

type Props = {
  accountType: string
  // 'misconfigured' → the video server is missing/invalid credentials.
  reason?: 'unavailable' | 'misconfigured'
}

export function LiveClassUnavailable({ accountType, reason = 'unavailable' }: Props) {
  const dashboardHref =
    accountType === 'tutor'
      ? '/dashboard/tutor'
      : accountType === 'parent'
        ? '/dashboard/parent'
        : accountType === 'student'
          ? '/dashboard/student'
          : '/dashboard'

  const misconfigured = reason === 'misconfigured'

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center space-y-6 rounded-3xl border bg-card p-10 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <HiOutlineVideoCameraSlash className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {misconfigured
              ? 'Video server is poorly configured'
              : 'Live classes are temporarily unavailable'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {misconfigured
              ? "The live-video service isn't set up correctly, so no one can join this class right now. Please contact support — an administrator needs to configure the video server before classes can run."
              : "We're working on bringing live classes back online. Hang tight — please check back in a little while."}
          </p>
        </div>
        <Link href={dashboardHref}>
          <Button variant="outline" className="rounded-full">
            <HiOutlineArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}

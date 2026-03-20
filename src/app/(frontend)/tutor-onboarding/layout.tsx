import { redirect } from 'next/navigation'
import { getServerSideUser } from '@/lib/auth'
import React from 'react'

export default async function TutorOnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, tutorProfile } = await getServerSideUser()

    if (!user) {
        redirect('/auth/login?redirect=/tutor-onboarding')
    }

    if (tutorProfile?.onboardingCompleted) {
        redirect('/dashboard/tutor')
    }

    return <>{children}</>
}

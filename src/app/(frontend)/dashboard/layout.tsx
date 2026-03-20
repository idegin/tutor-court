import React from 'react'
import { redirect } from 'next/navigation'
import { getServerSideUser } from '@/lib/auth'

type Props = {
    children: React.ReactNode
}

export default async function DashboardLayout({ children }: Props) {
    const { user, tutorProfile } = await getServerSideUser()

    if (!user) {
        redirect('/auth/login')
    }

    return (
        <div>
            {children}
        </div>
    )
}
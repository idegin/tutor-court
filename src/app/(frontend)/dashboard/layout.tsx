import React from 'react'
import SessionGuard from '@/components/auth/session-guard'

type Props = {
    children: React.ReactNode
}

export default async function DashboardLayout({ children }: Props) {

    return (
        <div>
            <SessionGuard />
            {children}
        </div>
    )
}
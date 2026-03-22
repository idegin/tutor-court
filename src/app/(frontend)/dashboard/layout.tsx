import React from 'react'

type Props = {
    children: React.ReactNode
}

export default async function DashboardLayout({ children }: Props) {

    return (
        <div>
            {children}
        </div>
    )
}
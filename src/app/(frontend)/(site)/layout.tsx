import React from 'react'
import { SiteHeader } from '@/components/layout/www-layout/site-header'
import { SiteFooter } from '@/components/layout/www-layout/site-footer'

type Props = {
    children: React.ReactNode
}

export default function SiteLayout({ children }: Props) {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-grow">
                {children}
            </main>
            <SiteFooter />
        </div>
    )
}
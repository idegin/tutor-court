import Image from 'next/image'
import Link from 'next/link'
import * as React from 'react'

import { cn } from '@/lib/utils'

type AuthPageShellProps = {
    children: React.ReactNode
    className?: string
    helpHref?: string
    loginHref?: string
    footerText?: string
}

export function AuthPageShell({
    children,
    className,
    helpHref = '#',
    loginHref = '/auth/login',
    footerText = '© 2026 TutorCourt. All rights reserved.',
}: AuthPageShellProps) {
    return (
        <div className={cn('min-h-screen bg-background', className)}>
            <header className="border-b bg-background/95 backdrop-blur">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <Image
                            src="/logo.png"
                            alt="TutorCourt logo"
                            width={28}
                            height={28}
                            className="rounded-md"
                        />
                        <span className="text-xl font-black text-foreground">TutorCourt</span>
                    </Link>

                    <div className="flex items-center gap-5">
                        <Link href={helpHref} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                            Help
                        </Link>
                        <Link
                            href={loginHref}
                            className="inline-flex h-9 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            Log In
                        </Link>
                    </div>
                </div>
            </header>

            <main>{children}</main>

            <footer className="border-t py-6">
                <p className="px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">{footerText}</p>
            </footer>
        </div>
    )
}

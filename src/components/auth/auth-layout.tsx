import Image from 'next/image'
import Link from 'next/link'
import * as React from 'react'

import { cn } from '@/lib/utils'

export type AuthLayoutNavLink = {
    href: string
    label: string
}

type AuthLayoutProps = {
    children: React.ReactNode
    heading?: string
    subheading?: string
    panelTitle?: string
    panelDescription?: string
    panelContent?: React.ReactNode
    navLinks?: AuthLayoutNavLink[]
    primaryActionLabel?: string
    primaryActionHref?: string
    className?: string
    variant?: 'split' | 'card'
    flipped?: boolean
    imagePosition?: 'left' | 'right'
    imageStyle?: 'full' | 'floating'
    imageUrl?: string
}

export function AuthLayout({
    children,
    heading,
    subheading,
    panelTitle,
    panelDescription,
    panelContent,
    navLinks = [],
    primaryActionLabel,
    primaryActionHref = '/auth/login',
    className,
    variant = 'split',
    flipped = false,
    imagePosition = 'right',
    imageStyle = 'full',
    imageUrl = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2000&auto=format&fit=crop",
}: AuthLayoutProps) {
    if (variant === 'card') {
        const isImageLeft = flipped || imagePosition === 'left'
        return (
            <div className={cn("min-h-screen flex flex-col bg-slate-50/50", className)}>
                {/* Global Header */}
                <header className="flex h-20 items-center px-6 lg:px-12 w-full max-w-[1400px] mx-auto justify-between">
                    <Link href="/" className="inline-flex items-center gap-2.5">
                        <Image src="/logo.png" alt="TutorCourt logo" width={32} height={32} className="rounded-md" />
                        <span className="text-[1.35rem] font-bold tracking-tight text-[#1A1F26]">TutorCourt</span>
                    </Link>
                    <div className="flex items-center gap-8">
                        <nav className="hidden md:flex items-center gap-8">
                            {navLinks.map((item) => (
                                <Link key={item.href + item.label} href={item.href} className="text-[15px] font-semibold text-[#1A1F26] hover:text-primary transition-colors">
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                        {primaryActionLabel ? (
                            <Link href={primaryActionHref} className="inline-flex h-10 items-center rounded-lg bg-primary px-6 text-[15px] font-bold text-primary-foreground transition-colors hover:bg-primary/90">
                                {primaryActionLabel}
                            </Link>
                        ) : null}
                    </div>
                </header>

                {/* Main Card Content */}
                <main className="flex-1 flex items-center justify-center p-6 lg:p-10 mb-10">
                    <div className={cn("w-full max-w-[1100px] bg-background rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:grid sm:grid-cols-2 overflow-hidden", isImageLeft ? "" : "")}>
                        {/* Form area */}
                        <div className={cn("flex flex-col justify-center px-8 py-12 lg:px-20 lg:py-20", isImageLeft ? "order-2" : "order-1")}>
                            {heading ? (
                                <h1 className="text-[2.5rem] font-bold tracking-tight text-[#1A1F26] dark:text-foreground leading-tight">{heading}</h1>
                            ) : null}
                            {subheading ? (
                                <p className="mt-3 text-[1.05rem] leading-relaxed text-muted-foreground">{subheading}</p>
                            ) : null}
                            <div className={cn(heading || subheading ? "mt-10" : "")}>{children}</div>
                        </div>

                        {/* Image area */}
                        <div className={cn(
                            "hidden sm:flex flex-col items-center justify-center relative min-h-[600px] p-6 lg:p-12",
                            isImageLeft ? "order-1" : "order-2",
                            imageStyle === 'floating' ? 'bg-[#e6fcf2]' : 'bg-transparent'
                        )}>
                            {imageStyle === 'full' ? (
                                <div className="absolute inset-0">
                                    <Image
                                        src={imageUrl}
                                        alt=""
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                    {/* Lighter overlay — image shows through */}
                                    <div className="absolute inset-0 bg-black/30" />
                                    {panelContent ? (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
                                            {panelContent}
                                        </div>
                                    ) : panelTitle ? (
                                        <div className="absolute bottom-0 left-0 right-0 z-10 p-10 lg:p-14">
                                            <h2 className="text-[2rem] font-bold text-white leading-snug">{panelTitle}</h2>
                                            {panelDescription ? (
                                                <p className="mt-4 text-white/80 text-[1.05rem]">{panelDescription}</p>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full z-10">
                                    <div className="relative w-full max-w-[420px] aspect-[4/3] rounded-3xl overflow-hidden shadow-xl border-[6px] border-white mb-8">
                                        <Image
                                            src={imageUrl}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                    {panelTitle ? (
                                        <div className="text-center px-4 max-w-[420px]">
                                            <h2 className="text-2xl font-bold text-[#1A1F26] mb-3">{panelTitle}</h2>
                                            {panelDescription ? (
                                                <p className="text-[#1A1F26]/70 leading-relaxed">{panelDescription}</p>
                                            ) : null}
                                        </div>
                                    ) : null}
                                    {panelContent}
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                <footer className="py-8 text-center text-sm font-medium text-muted-foreground/80 border-t border-border/40">
                    <div className="flex items-center justify-center gap-8 mb-4">
                        <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
                        <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-foreground transition-colors">Help Center</Link>
                    </div>
                    © 2024 TutorCourt. All rights reserved.
                </footer>
            </div>
        )
    }

    // ── Split layout ──────────────────────────────────────────────────────────
    return (
        <div className={cn('relative flex min-h-screen lg:h-screen flex-col bg-background lg:grid lg:grid-cols-2 lg:overflow-hidden', className)}>
            {/* Absolute Global Header for Split Layout */}
            <header className="absolute top-0 left-0 right-0 h-24 px-6 sm:px-10 lg:px-16 flex items-center justify-between z-50">
                <Link href="/" className="inline-flex items-center gap-2.5">
                    <Image
                        src="/logo.png"
                        alt="TutorCourt logo"
                        width={32}
                        height={32}
                        className="rounded-md"
                    />
                    <span className="text-xl font-bold tracking-tight text-foreground">TutorCourt</span>
                </Link>

                {navLinks && navLinks.length > 0 && (
                    <nav className="flex items-center gap-8">
                        {navLinks.map((item) => (
                            <Link key={item.href + item.label} href={item.href} className="text-[15px] font-semibold hover:text-primary transition-colors">
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                )}
            </header>

            {/* Left Column — form */}
            <div className={cn("flex flex-col border-border/50 px-6 sm:px-10 lg:px-16 pt-24 lg:overflow-y-auto h-full", flipped ? "lg:order-2" : "lg:order-1")}>
                <div className="flex flex-1 items-center justify-center py-10 lg:py-20 lg:pr-8">
                    <div className="mx-auto w-full max-w-110">
                        {heading ? (
                            <h1 className="text-[2.5rem] font-bold tracking-tight text-[#1A1F26] dark:text-foreground leading-tight">{heading}</h1>
                        ) : null}
                        {subheading ? (
                            <p className="mt-3 text-[1.05rem] leading-relaxed text-muted-foreground">
                                {subheading}
                            </p>
                        ) : null}
                        <div className={cn(heading || subheading ? "mt-10" : "")}>{children}</div>
                    </div>
                </div>
            </div>

            {/* Right Column — image always renders; overlay is light so the photo shows */}
            <div className={cn("relative hidden w-full h-full lg:block", flipped ? "lg:order-1" : "lg:order-2")}>
                {/* Background photo */}
                <Image
                    src={imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                    priority
                />

                {/* Subtle dark overlay — reduced from the previous nearly-opaque gradient */}
                <div className="absolute inset-0 bg-black/40" />

                {/* Bottom fade for legibility of text content */}
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />

                {/* Panel content — centered when provided, or quote card at the bottom */}
                {panelContent ? (
                    <div className="absolute inset-0 z-10 flex items-end justify-center pb-16 px-10">
                        {panelContent}
                    </div>
                ) : (
                    <div className="absolute bottom-0 left-0 right-0 z-10 p-12 lg:p-16">
                        <div className="mx-auto w-full max-w-[480px]">
                            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-8 pb-9 backdrop-blur-md">
                                <svg className="mb-5 h-7 w-7 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                                </svg>
                                {panelTitle ? (
                                    <h2 className="text-[1.6rem] font-bold text-white leading-snug tracking-tight">
                                        "{panelTitle}"
                                    </h2>
                                ) : null}
                                {panelDescription ? (
                                    <div className="mt-6 flex items-center gap-3">
                                        <div className="h-px w-6 bg-primary shrink-0" />
                                        <p className="text-sm font-semibold text-white/80 tracking-wide uppercase">
                                            {panelDescription}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

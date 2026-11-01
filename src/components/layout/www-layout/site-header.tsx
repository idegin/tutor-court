'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2';

const NAV_LINKS = [
    { label: 'Home', href: '/', exact: true },
    { label: 'Find Tutors', href: '/search', match: ['/search', '/tutors'] },
    { label: 'For Parents', href: '/for-parents', match: ['/for-parents'] },
    { label: 'For Tutors', href: '/for-tutors', match: ['/for-tutors'] },
    { label: 'Subjects', href: '/subjects', match: ['/subjects'] },
];

function isActive(pathname: string, link: typeof NAV_LINKS[0]) {
    if (link.exact) return pathname === link.href;
    return link.match?.some(m => pathname?.startsWith(m)) ?? false;
}

export function SiteHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    const initials = user
        ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
        : '';

    const dashboardHref = user?.accountType === 'admin'
        ? '/dashboard/admin/overview'
        : `/dashboard/${user?.accountType ?? ''}`;

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b-2 border-foreground bg-background">
            <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4 md:px-8">

                {/* Logo */}
                <div className="flex items-center gap-6 md:gap-10">
                    <Link href="/" className="flex items-center gap-2 shrink-0">
                        <img src="/logo.png" alt="TutorCourt" width={36} className="rounded-lg" />
                        <span className="text-lg md:text-xl font-bold">TutorCourt</span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex gap-6 lg:gap-8">
                        {NAV_LINKS.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-sm font-bold pb-1 transition-colors ${
                                    isActive(pathname, link)
                                        ? 'border-b-2 border-foreground text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3 md:gap-4">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="border-none gap-2 px-2">
                                    <Avatar className="h-8 w-8 rounded-full border-2 border-foreground">
                                        <AvatarImage
                                            src={typeof user.avatar === 'object' && user.avatar?.url ? user.avatar.url : undefined}
                                            alt={user.firstName || 'User'}
                                        />
                                        <AvatarFallback className="bg-tutor-purple text-foreground font-bold text-xs">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="hidden md:flex flex-col items-start text-left">
                                        <span className="text-sm font-bold leading-none">
                                            {user.firstName} {user.lastName}
                                        </span>
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 border-2 border-foreground">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-sm font-bold leading-none">
                                            {user.firstName} {user.lastName}
                                        </p>
                                        <p className="text-xs font-bold text-muted-foreground">{user.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-foreground h-[2px]" />
                                <DropdownMenuItem onClick={() => router.push(dashboardHref)}>
                                    Dashboard
                                </DropdownMenuItem>
                                {user.accountType === 'admin' && (
                                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                                        Payload Admin
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    onClick={() => router.push(`/dashboard/${user.accountType}/settings`)}
                                >
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-foreground h-[2px]" />
                                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="hidden md:flex items-center gap-4">
                            <Link
                                href="/auth/login"
                                className="text-sm font-bold text-foreground hover:text-tutor-red-400 transition-colors whitespace-nowrap"
                            >
                                Log In
                            </Link>
                            <Link
                                href="/auth/register"
                                className="text-sm font-bold bg-tutor-purple-400 text-foreground border-2 border-foreground px-5 py-2 rounded hover:bg-tutor-purple-500 transition-colors whitespace-nowrap"
                            >
                                Sign Up
                            </Link>
                        </div>
                    )}

                    {/* Hamburger — mobile only */}
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden border-none"
                                aria-label="Open menu"
                            >
                                <HiOutlineBars3 className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72 border-l-2 border-foreground p-0 flex flex-col">
                            {/* Mobile menu header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-foreground">
                                <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                                    <img src="/logo.png" alt="TutorCourt" width={32} className="rounded-md" />
                                    <span className="font-bold text-base">TutorCourt</span>
                                </Link>
                            </div>

                            {/* Nav links */}
                            <nav className="flex flex-col px-4 py-4 gap-1">
                                {NAV_LINKS.map(link => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={`px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                                            isActive(pathname, link)
                                                ? 'bg-foreground text-background'
                                                : 'text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </nav>

                            <div className="mt-auto border-t-2 border-foreground px-4 py-4 flex flex-col gap-2">
                                {user ? (
                                    <>
                                        <div className="flex items-center gap-3 px-3 py-2">
                                            <Avatar className="h-8 w-8 border-2 border-foreground rounded-full">
                                                <AvatarImage src={typeof user.avatar === 'object' && user.avatar?.url ? user.avatar.url : undefined} />
                                                <AvatarFallback className="bg-tutor-purple text-foreground font-bold text-xs">{initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold leading-none">{user.firstName} {user.lastName}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                        <Link href={dashboardHref} onClick={() => setMobileOpen(false)}
                                            className="px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-muted transition-colors">
                                            Dashboard
                                        </Link>
                                        {user.accountType === 'admin' && (
                                            <Link href="/admin" onClick={() => setMobileOpen(false)}
                                                className="px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-muted transition-colors">
                                                Payload Admin
                                            </Link>
                                        )}
                                        <button onClick={handleLogout}
                                            className="px-3 py-2.5 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left">
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/auth/login" onClick={() => setMobileOpen(false)}
                                            className="px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-muted transition-colors text-center">
                                            Log In
                                        </Link>
                                        <Link href="/auth/register" onClick={() => setMobileOpen(false)}
                                            className="px-3 py-2.5 rounded-lg text-sm font-bold bg-tutor-purple-400 border-2 border-foreground hover:bg-tutor-purple-500 transition-colors text-center">
                                            Sign Up
                                        </Link>
                                    </>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}

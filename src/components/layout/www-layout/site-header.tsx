'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

export function SiteHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();

    const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '';

    const handleLogout = async () => {
        await fetch('/api/users/logout', { method: 'POST' });
        window.location.href = '/';
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b-2 border-foreground bg-background">
            <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
                <div className="flex items-center gap-10">
                    <Link href="/" className="flex items-center space-x-2">
                        <img src="/logo.png" alt="Academia Logo" width={40} className='rounded-lg' />
                        <span className='text-xl font-bold'>TutorCourt</span>
                    </Link>
                    <nav className="hidden md:flex gap-8 px-8">
                        <Link
                            href="/"
                            className={`text-sm font-bold pb-1 transition-colors ${pathname === '/'
                                ? 'border-b-2 border-foreground text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Home
                        </Link>
                        <Link
                            href="/search"
                            className={`text-sm font-bold pb-1 transition-colors ${pathname?.startsWith('/find-tutors')
                                ? 'border-b-2 border-foreground text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Find Tutors
                        </Link>
                        <Link
                            href="/for-parents"
                            className={`text-sm font-bold pb-1 transition-colors ${pathname?.startsWith('/for-parents')
                                ? 'border-b-2 border-foreground text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            For Parents
                        </Link>
                        <Link
                            href="/for-tutors"
                            className={`text-sm font-bold pb-1 transition-colors ${pathname?.startsWith('/for-parents')
                                ? 'border-b-2 border-foreground text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            For Tutors
                        </Link>
                        <Link
                            href="/subjects"
                            className={`text-sm font-bold pb-1 transition-colors ${pathname?.startsWith('/for-parents')
                                ? 'border-b-2 border-foreground text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Subjects
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4 md:gap-8">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className='border-none'>
                                    <Avatar className="h-8 w-8 rounded-full border-2 border-foreground">
                                        <AvatarImage src={typeof user.avatar === 'object' && user.avatar?.url ? user.avatar.url : undefined} alt={user.firstName || "User"} />
                                        <AvatarFallback className="bg-tutor-purple text-foreground font-bold">{initials}</AvatarFallback>
                                    </Avatar>
                                    <span className="hidden md:flex md:flex-col md:items-start text-left">
                                        <span className="text-sm font-bold leading-none">{user.firstName} {user.lastName}</span>
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 border-2 border-foreground">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-bold leading-none">{user.firstName} {user.lastName}</p>
                                        <p className="text-xs font-bold leading-none text-muted-foreground">{user.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-foreground h-[2px]" />
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (user?.accountType === 'admin') {
                                            router.push('/admin')
                                        } else if (user?.accountType) {
                                            router.push(`/dashboard/${user.accountType}`)
                                        } else {
                                            router.push('/dashboard')
                                        }
                                    }}
                                >
                                    Dashboard
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/${user.accountType}/settings`)} >
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-foreground h-[2px]" />
                                <DropdownMenuItem onClick={handleLogout} variant='destructive'>
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <>
                            <Link
                                href="/auth/login"
                                className="text-sm font-bold text-foreground hover:text-tutor-red-400 transition-colors whitespace-nowrap"
                            >
                                Log In
                            </Link>
                            <Link
                                href="/auth/register"
                                className="text-sm font-bold bg-tutor-purple-400 text-foreground border-2 border-foreground px-4 py-2 md:px-6 md:py-2.5 rounded hover:bg-tutor-purple-500 transition-colors whitespace-nowrap"
                            >
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

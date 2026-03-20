"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HiUser, HiSquares2X2, HiArrowRightOnRectangle } from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { WwwLayout } from "@/components/layout/www-layout"
import { useAuth } from "@/components/providers/auth-provider"

const navLinks = [
    { href: "#for-parents", label: "For Parents" },
    { href: "#for-tutors", label: "For Tutors" },
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
]

export function HomeHeader() {
    const { user } = useAuth()
    const router = useRouter()

    const handleLogout = async () => {
        await fetch('/api/users/logout', { method: 'POST' })
        window.location.href = '/'
    }

    const initials = user?.firstName && user?.lastName
        ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
        : user?.email?.[0].toUpperCase() || 'U'

    return (
        <header className="sticky top-0 z-40 border-b bg-card">
            <WwwLayout>
                <div className="flex h-16 items-center justify-between gap-4">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <Image
                            src="/logo.png"
                            alt="TutorCourt logo"
                            width={32}
                            height={32}
                            className="rounded-lg"
                            priority
                        />
                        <span className="text-lg font-black tracking-tight text-foreground">
                            TutorCourt
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-8 md:flex">
                        {navLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center">
                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                        <Avatar className="h-10 w-10 border border-border">
                                            <AvatarImage src={typeof user.avatar === 'object' && user.avatar?.url ? user.avatar.url : undefined} alt={user.firstName} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="cursor-pointer">
                                        <HiUser className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push(`/dashboard/${user?.accountType || ''}`)} className="cursor-pointer">
                                        <HiSquares2X2 className="mr-2 h-4 w-4" />
                                        <span>Dashboard</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-700">
                                        <HiArrowRightOnRectangle className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button
                                className="px-6 font-semibold shadow-sm bg-tutor-purple-600 text-white hover:bg-tutor-purple-700"
                                size="sm"
                                onClick={() => router.push('/auth/login')}
                            >
                                Login
                            </Button>
                        )}
                    </div>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="rounded-xl md:hidden"
                                aria-label="Open navigation menu"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="size-5"
                                >
                                    <path d="M3 6h18" />
                                    <path d="M3 12h18" />
                                    <path d="M3 18h18" />
                                </svg>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-background w-[300px] border-l sm:w-[400px]">
                            <SheetHeader className="pb-4 border-b">
                                <SheetTitle className="text-left text-foreground inline-flex items-center gap-2">
                                    <Image
                                        src="/logo.png"
                                        alt="TutorCourt logo"
                                        width={24}
                                        height={24}
                                        className="rounded-md"
                                    />
                                    TutorCourt
                                </SheetTitle>
                            </SheetHeader>

                            <div className="flex flex-col gap-4 py-6">
                                {user && (
                                    <div className="flex items-center gap-3 px-2 mb-2 pb-4 border-b">
                                        <Avatar className="h-12 w-12 border border-border">
                                            <AvatarImage src={typeof user.avatar === 'object' && user.avatar?.url ? user.avatar.url : undefined} alt={user.firstName} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold">{user.firstName} {user.lastName}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col space-y-2">
                                    {navLinks.map((link) => (
                                        <a
                                            key={link.label}
                                            href={link.href}
                                            className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        >
                                            {link.label}
                                        </a>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                                    {user ? (
                                        <>
                                            <Button variant="ghost" className="justify-start gap-2 h-11" onClick={() => router.push('/dashboard/profile')}>
                                                <HiUser className="h-5 w-5" /> Profile
                                            </Button>
                                            <Button variant="ghost" className="justify-start gap-2 h-11" onClick={() => router.push(`/dashboard/${user?.accountType || ''}`)}>
                                                <HiSquares2X2 className="h-5 w-5" /> Dashboard
                                            </Button>
                                            <Button variant="ghost" className="justify-start gap-2 h-11 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={handleLogout}>
                                                <HiArrowRightOnRectangle className="h-5 w-5" /> Logout
                                            </Button>
                                        </>
                                    ) : (
                                        <Button className="w-full h-12 text-[15px] font-semibold bg-tutor-purple-600 hover:bg-tutor-purple-700" onClick={() => router.push('/auth/login')}>
                                            Login
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </WwwLayout>
        </header>
    )
}

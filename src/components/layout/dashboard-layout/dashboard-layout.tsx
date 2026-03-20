'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
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
import { HiOutlineBars3, HiXMark, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';
import { useAuth } from '@/components/providers/auth-provider';

export interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    activeIcon: React.ElementType;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    navItems: NavItem[];
    userRoleLabel: string;
}

export function DashboardLayout({ children, navItems, userRoleLabel }: DashboardLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    const handleLogout = async () => {
        await fetch('/api/users/logout', { method: 'POST' });
        window.location.href = '/';
    };

    const initials = user?.firstName && user?.lastName
        ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
        : user?.email?.[0].toUpperCase() || 'U';

    return (
        <div className="flex h-screen w-full flex-col bg-background">
            {/* Header */}
            <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <HiXMark className="h-5 w-5" /> : <HiOutlineBars3 className="h-5 w-5" />}
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                    <Link href={`/dashboard/${userRoleLabel.toLowerCase()}`} className="flex items-center gap-2">
                        <Image
                            src="/logo.png"
                            alt="TutorCourt logo"
                            width={32}
                            height={32}
                            className="rounded-lg"
                            priority
                        />
                        <span className="text-lg font-black tracking-tight text-foreground hidden sm:inline-block">
                            TutorCourt
                        </span>
                    </Link>
                    <span className="hidden ml-2 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground lg:inline-flex">
                        {userRoleLabel}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative flex items-center gap-2 h-auto px-2 py-1.5 rounded-full hover:bg-muted">
                                    <Avatar className="h-8 w-8 rounded-full border border-border">
                                        <AvatarImage src={typeof user.avatar === 'object' && user.avatar?.url ? user.avatar.url : undefined} alt={user.firstName || "User"} />
                                        <AvatarFallback className="bg-muted text-muted-foreground">{initials}</AvatarFallback>
                                    </Avatar>
                                    <span className="hidden md:flex md:flex-col md:items-start text-left">
                                        <span className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</span>
                                        <span className="text-xs text-muted-foreground mt-1 max-w-[120px] truncate">{user.email}</span>
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 border border-border bg-background shadow-none">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="cursor-pointer">Profile</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/${user.accountType}/settings`)} className="cursor-pointer">Settings</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-700">Logout</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside
                    className={`${mobileMenuOpen ? 'block' : 'hidden'
                        } absolute inset-y-0 left-0 z-20 border-r bg-background md:static md:flex flex-col flex-shrink-0 mt-16 md:mt-0 transition-all duration-300 ${isCollapsed ? 'w-[72px]' : 'w-64'
                        }`}
                >
                    <nav className="flex flex-col gap-2 p-4 flex-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const rootPath = `/dashboard/${userRoleLabel.toLowerCase()}`;
                            const isActive = item.href === rootPath
                                ? pathname === item.href
                                : pathname === item.href || pathname.startsWith(`${item.href}/`);

                            const Icon = isActive ? item.activeIcon : item.icon;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    title={isCollapsed ? item.name : undefined}
                                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
                                        ? 'bg-secondary text-secondary-foreground'
                                        : 'text-muted-foreground hover:bg-primary/30 hover:text-foreground'
                                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Icon className="h-5 w-5 shrink-0" />
                                    {!isCollapsed && <span>{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Collapse Toggle */}
                    <div className="hidden md:flex p-4 border-t mt-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`w-full flex ${isCollapsed ? 'justify-center' : 'justify-start px-2'} text-muted-foreground hover:text-foreground`}
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? (
                                <HiOutlineChevronRight className="h-5 w-5 shrink-0" />
                            ) : (
                                <>
                                    <HiOutlineChevronLeft className="h-5 w-5 shrink-0 mr-2" />
                                    <span>Collapse</span>
                                </>
                            )}
                        </Button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20">
                    {children}
                </main>
            </div>
        </div>
    );
}

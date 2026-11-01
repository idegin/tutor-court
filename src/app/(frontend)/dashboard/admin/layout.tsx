'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
    HiOutlineHome,
    HiHome,
    HiOutlineUsers,
    HiUsers,
    HiOutlineBookOpen,
    HiBookOpen,
    HiOutlineCalendarDays,
    HiCalendarDays,
    HiOutlineTableCells,
    HiTableCells,
    HiOutlineUserGroup,
    HiUserGroup,
} from 'react-icons/hi2';
import { DashboardLayout } from '@/components/layout/dashboard-layout/dashboard-layout';
import type { NavItem } from '@/components/layout/dashboard-layout/dashboard-layout';

const adminNavItems: NavItem[] = [
    {
        name: 'Overview',
        href: '/dashboard/admin/overview',
        icon: HiOutlineHome,
        activeIcon: HiHome,
    },
    {
        name: 'Tutors',
        href: '/dashboard/admin/tutors',
        icon: HiOutlineUsers,
        activeIcon: HiUsers,
    },
    {
        name: 'Users',
        href: '/dashboard/admin/users',
        icon: HiOutlineUserGroup,
        activeIcon: HiUserGroup,
    },
    {
        name: 'Subjects',
        href: '/dashboard/admin/subjects',
        icon: HiOutlineBookOpen,
        activeIcon: HiBookOpen,
    },
    {
        name: 'Classes',
        href: '/dashboard/admin/classes',
        icon: HiOutlineTableCells,
        activeIcon: HiTableCells,
    },
    {
        name: 'Calendar',
        href: '/dashboard/admin/calendar',
        icon: HiOutlineCalendarDays,
        activeIcon: HiCalendarDays,
    },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isSuspended } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (user === undefined) return;

        if (!user) {
            router.push(isSuspended ? '/auth/login?reason=suspended' : '/auth/login');
        } else if (user.accountType !== 'admin') {
            router.push(`/dashboard/${user.accountType}`);
        } else {
            setIsAuthorized(true);
        }
    }, [user, isSuspended, router]);

    if (!isAuthorized) {
        return (
            <DashboardLayout navItems={adminNavItems} userRoleLabel="Admin">
                <div className="flex min-h-[60vh] w-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout navItems={adminNavItems} userRoleLabel="Admin">
            {children}
        </DashboardLayout>
    );
}

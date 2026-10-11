'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
    HiOutlineHome,
    HiHome,
    HiOutlineUsers,
    HiUsers,
    HiOutlineChartBar,
    HiChartBar,
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
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (user === undefined) return;

        if (!user) {
            router.push('/auth/login');
        } else if (user.accountType !== 'admin') {
            router.push(`/dashboard/${user.accountType}`);
        } else {
            setIsAuthorized(true);
        }
    }, [user, router]);

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

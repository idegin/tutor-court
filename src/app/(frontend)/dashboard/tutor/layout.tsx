'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
    HiOutlineHome,
    HiHome,
    HiOutlineCalendar,
    HiCalendar,
    HiOutlineAcademicCap,
    HiAcademicCap,
    HiOutlineCog6Tooth,
    HiCog6Tooth,
    HiOutlineWallet,
    HiWallet,
    HiOutlineChatBubbleLeftRight,
    HiChatBubbleLeftRight
} from 'react-icons/hi2';
import { DashboardLayout } from '@/components/layout/dashboard-layout/dashboard-layout';

const tutorNavItems = [
    {
        name: 'Overview',
        href: '/dashboard/tutor',
        icon: HiOutlineHome,
        activeIcon: HiHome,
    },
    {
        name: 'Messages',
        href: '/dashboard/tutor/messages',
        icon: HiOutlineChatBubbleLeftRight,
        activeIcon: HiChatBubbleLeftRight,
    },
    {
        name: 'Calendar',
        href: '/dashboard/tutor/calendar',
        icon: HiOutlineCalendar,
        activeIcon: HiCalendar,
    },
    {
        name: 'Classes',
        href: '/dashboard/tutor/classes',
        icon: HiOutlineAcademicCap,
        activeIcon: HiAcademicCap,
    },
    {
        name: 'Wallet',
        href: '/dashboard/tutor/wallet',
        icon: HiOutlineWallet,
        activeIcon: HiWallet,
    },
    {
        name: 'Settings',
        href: '/dashboard/tutor/settings',
        icon: HiOutlineCog6Tooth,
        activeIcon: HiCog6Tooth,
    },
];

export default function TutorDashboardLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Simple auth check since we don't have a status indicator
        if (user === undefined) return; // Still determining if we wanted undefined vs null, let's just check null

        if (!user) {
            router.push('/auth/login');
        } else if (user.accountType !== 'tutor') {
            router.push(`/dashboard/${user.accountType}`);
        } else {
            setIsAuthorized(true);
        }
    }, [user, router]);

    return (
        <DashboardLayout navItems={tutorNavItems} userRoleLabel="Tutor">
            {children}
        </DashboardLayout>
    );
}

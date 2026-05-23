'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
    HiOutlineHome,
    HiHome,
    HiOutlineCalendar,
    HiCalendar,
    HiOutlineCog6Tooth,
    HiCog6Tooth,
    HiOutlineWallet,
    HiWallet,
    HiOutlineChatBubbleLeftRight,
    HiChatBubbleLeftRight,
    HiOutlineClipboardDocumentList,
    HiClipboardDocumentList,
    HiOutlineUsers,
    HiUsers,
    HiOutlineClipboardDocumentCheck,
    HiClipboardDocumentCheck,
    HiOutlineBell,
    HiBell,
} from 'react-icons/hi2';
import { DashboardLayout } from '@/components/layout/dashboard-layout/dashboard-layout';
import type { NavItem } from '@/components/layout/dashboard-layout/dashboard-layout';

const isDev = process.env.NODE_ENV !== 'production';

// Items marked devOnly are hidden in production (pages not yet ready)
const allTutorNavItems: (NavItem & { devOnly?: boolean })[] = [
    {
        name: 'Overview',
        href: '/dashboard/tutor',
        icon: HiOutlineHome,
        activeIcon: HiHome,
    },
    {
        name: 'Classes',
        href: '/dashboard/tutor/classes',
        icon: HiOutlineUsers,
        activeIcon: HiUsers,
    },
    {
        name: 'Assessments',
        href: '/dashboard/tutor/assessments',
        icon: HiOutlineClipboardDocumentCheck,
        activeIcon: HiClipboardDocumentCheck,
    },
    {
        name: 'Messages',
        href: '/dashboard/tutor/messages',
        icon: HiOutlineChatBubbleLeftRight,
        activeIcon: HiChatBubbleLeftRight,
        devOnly: true,
    },
    {
        name: 'Calendar',
        href: '/dashboard/tutor/calendar',
        icon: HiOutlineCalendar,
        activeIcon: HiCalendar,
        devOnly: true,
    },
    {
        name: 'Bookings',
        href: '/dashboard/tutor/bookings',
        icon: HiOutlineClipboardDocumentList,
        activeIcon: HiClipboardDocumentList,
        devOnly: true,
    },
    {
        name: 'Wallet',
        href: '/dashboard/tutor/wallet',
        icon: HiOutlineWallet,
        activeIcon: HiWallet,
    },
    {
        name: 'Notifications',
        href: '/dashboard/tutor/notifications',
        icon: HiOutlineBell,
        activeIcon: HiBell,
    },
    {
        name: 'Settings',
        href: '/dashboard/tutor/settings',
        icon: HiOutlineCog6Tooth,
        activeIcon: HiCog6Tooth,
    },
];

const tutorNavItems: NavItem[] = allTutorNavItems.filter(item => isDev || !item.devOnly);

export default function TutorDashboardLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (user === undefined) return;

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

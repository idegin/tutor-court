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
    HiOutlineChartBar,
    HiChartBar,
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
        name: 'Progress',
        href: '/dashboard/tutor/progress',
        icon: HiOutlineChartBar,
        activeIcon: HiChartBar,
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
    },
    {
        name: 'Bookings',
        href: '/dashboard/tutor/bookings',
        icon: HiOutlineClipboardDocumentList,
        activeIcon: HiClipboardDocumentList,
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

    // Don't render tutor-only UI (e.g. the "Start live class" action) until auth
    // is confirmed. Rendering children while unauthenticated showed controls that
    // then failed server-side with a misleading "Only tutors can…" error.
    if (!isAuthorized) {
        return (
            <DashboardLayout navItems={tutorNavItems} userRoleLabel="Tutor">
                <div className="flex min-h-[60vh] w-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout navItems={tutorNavItems} userRoleLabel="Tutor">
            {children}
        </DashboardLayout>
    );
}

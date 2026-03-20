'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
    HiOutlineHome,
    HiHome,
} from 'react-icons/hi2';
import { DashboardLayout } from '@/components/layout/dashboard-layout/dashboard-layout';

const parentNavItems = [
    {
        name: 'Overview',
        href: '/dashboard/parent',
        icon: HiOutlineHome,
        activeIcon: HiHome,
    },
];

export default function ParentDashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardLayout navItems={parentNavItems} userRoleLabel="Parent">
            {children}
        </DashboardLayout>
    );
}

'use client'

import {
  HiOutlineHome,
  HiHome,
  HiOutlineWallet,
  HiWallet,
  HiOutlineUsers,
  HiUsers,
  HiOutlineCalendar,
  HiCalendar,
  HiOutlineBell,
  HiBell,
  HiOutlineAcademicCap,
  HiAcademicCap,
  HiOutlineChartBar,
  HiChartBar,
  HiOutlineClipboardDocumentList,
  HiClipboardDocumentList,
} from 'react-icons/hi2'

import { DashboardLayout } from '@/components/layout/dashboard-layout/dashboard-layout'

const parentNavItems = [
  {
    name: 'Overview',
    href: '/dashboard/parent',
    icon: HiOutlineHome,
    activeIcon: HiHome,
  },
  {
    name: 'Students',
    href: '/dashboard/parent/students',
    icon: HiOutlineUsers,
    activeIcon: HiUsers,
  },
  {
    name: 'Classes',
    href: '/dashboard/parent/classes',
    icon: HiOutlineAcademicCap,
    activeIcon: HiAcademicCap,
  },
  {
    name: 'Bookings',
    href: '/dashboard/parent/bookings',
    icon: HiOutlineClipboardDocumentList,
    activeIcon: HiClipboardDocumentList,
  },
  {
    name: 'Progress',
    href: '/dashboard/parent/progress',
    icon: HiOutlineChartBar,
    activeIcon: HiChartBar,
  },
  {
    name: 'Wallet',
    href: '/dashboard/parent/wallet',
    icon: HiOutlineWallet,
    activeIcon: HiWallet,
  },
  {
    name: 'Calendar',
    href: '/dashboard/parent/calendar',
    icon: HiOutlineCalendar,
    activeIcon: HiCalendar,
  },
  {
    name: 'Notifications',
    href: '/dashboard/parent/notifications',
    icon: HiOutlineBell,
    activeIcon: HiBell,
  },
]

export function ParentShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={parentNavItems} userRoleLabel="Parent">
      {children}
    </DashboardLayout>
  )
}

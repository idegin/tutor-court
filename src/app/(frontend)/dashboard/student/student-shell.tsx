'use client'

import {
  HiOutlineHome,
  HiHome,
  HiOutlineAcademicCap,
  HiAcademicCap,
  HiOutlineClipboardDocumentList,
  HiClipboardDocumentList,
  HiOutlineCalendar,
  HiCalendar,
  HiOutlineCalendarDays,
  HiCalendarDays,
  HiOutlineBell,
  HiBell,
  HiOutlineChartBar,
  HiChartBar,
} from 'react-icons/hi2'

import { DashboardLayout } from '@/components/layout/dashboard-layout/dashboard-layout'

const studentNavItems = [
  {
    name: 'Overview',
    href: '/dashboard/student',
    icon: HiOutlineHome,
    activeIcon: HiHome,
  },
  {
    name: 'Classes',
    href: '/dashboard/student/classes',
    icon: HiOutlineAcademicCap,
    activeIcon: HiAcademicCap,
  },
  {
    name: 'Assessments',
    href: '/dashboard/student/assessments',
    icon: HiOutlineClipboardDocumentList,
    activeIcon: HiClipboardDocumentList,
  },
  {
    name: 'Bookings',
    href: '/dashboard/student/bookings',
    icon: HiOutlineCalendarDays,
    activeIcon: HiCalendarDays,
  },
  {
    name: 'Progress',
    href: '/dashboard/student/progress',
    icon: HiOutlineChartBar,
    activeIcon: HiChartBar,
  },
  {
    name: 'Calendar',
    href: '/dashboard/student/calendar',
    icon: HiOutlineCalendar,
    activeIcon: HiCalendar,
  },
  {
    name: 'Notifications',
    href: '/dashboard/student/notifications',
    icon: HiOutlineBell,
    activeIcon: HiBell,
  },
]

export function StudentShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={studentNavItems} userRoleLabel="Student">
      {children}
    </DashboardLayout>
  )
}

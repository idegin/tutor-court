'use client'

import {
  HiOutlineHome,
  HiHome,
  HiOutlineAcademicCap,
  HiAcademicCap,
  HiOutlineClipboardDocumentList,
  HiClipboardDocumentList,
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
]

export function StudentShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={studentNavItems} userRoleLabel="Student">
      {children}
    </DashboardLayout>
  )
}

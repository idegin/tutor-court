'use client'

import {
  HiOutlineHome,
  HiHome,
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
    name: 'Assignments',
    href: '/dashboard/student/assignments',
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

'use client'

import {
  HiOutlineHome,
  HiHome,
  HiOutlineWallet,
  HiWallet,
  HiOutlineUsers,
  HiUsers,
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
    name: 'Wallet',
    href: '/dashboard/parent/wallet',
    icon: HiOutlineWallet,
    activeIcon: HiWallet,
  },
]

export function ParentShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={parentNavItems} userRoleLabel="Parent">
      {children}
    </DashboardLayout>
  )
}

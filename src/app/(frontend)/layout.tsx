import React from 'react'
import localFont from 'next/font/local'
import { QueryProvider } from '@/components/providers/query-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { OptionsProvider } from '@/components/providers/options-provider'
import { Toaster } from '@/components/ui/sonner'
import { getServerSideUser } from '@/lib/auth'
import './global.css'
import Providers from '@/components/providers'

const lato = localFont({
  src: [
    { path: '../../../public/fonts/lato-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/lato-700.woff2', weight: '700', style: 'normal' },
    { path: '../../../public/fonts/lato-900.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
})

export const viewport = {
  themeColor: '#7ab62c',
}

export const metadata = {
  description: 'TutorCourt is an online tutoring marketplace that connects students with qualified tutors for personalized learning experiences.',
  title: 'TutorCourt - Your Trusted Online Tutoring Marketplace',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TutorCourt',
  },
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const { user, tutorProfile, dependencies } = await getServerSideUser()

  return (
    <html lang="en" className={`${lato.className} ${lato.variable}`}>
      <body className="bg-background text-foreground min-h-screen">
        <Providers>
          <OptionsProvider initialSubjects={dependencies?.subjects || []}>
            <AuthProvider initialUser={user} initialTutorProfile={tutorProfile}>
              <QueryProvider>
                {children}
                <Toaster position="top-right" />
              </QueryProvider>
            </AuthProvider>
          </OptionsProvider>
        </Providers>
      </body>
    </html>
  )
}

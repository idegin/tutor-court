import React from 'react'
import { Lato } from 'next/font/google'
import { QueryProvider } from '@/components/providers/query-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { getServerSideUser } from '@/lib/auth'
import './global.css'

const lato = Lato({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata = {
  description: 'TutorCourt is an online tutoring marketplace that connects students with qualified tutors for personalized learning experiences.',
  title: 'TutorCourt - Your Trusted Online Tutoring Marketplace',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const { user, tutorProfile } = await getServerSideUser()

  return (
    <html lang="en" className={`${lato.className} ${lato.variable}`}>
      <body>
        <AuthProvider initialUser={user} initialTutorProfile={tutorProfile}>
          <QueryProvider>
            {children}
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

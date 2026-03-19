import React from 'react'
import { Lato } from 'next/font/google'
import { QueryProvider } from '@/components/providers/query-provider'
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

  return (
    <html lang="en" className={`${lato.className} ${lato.variable}`}>
      <body>
        <QueryProvider>
          <main>{children}</main>
        </QueryProvider>
      </body>
    </html>
  )
}

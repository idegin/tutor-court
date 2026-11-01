import React from 'react'
import type { Metadata } from 'next'
import { SiteHero } from '@/components/site/hero'
import { HighlyRatedTutors } from '@/components/site/highly-rated-tutors'
import { ReviewsSection } from '@/components/site/reviews'
import { HowItWorks } from '@/components/site/how-it-works'
import { FeaturesSection } from '@/components/site/features'
import { FaqSection } from '@/components/site/faq'
import { CallToAction } from '@/components/site/cta'
import { JsonLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
  title: 'TutorCourt — Find Expert Tutors in Nigeria',
  description: "Nigeria's trusted tutoring marketplace. Connect with vetted, expert K-12 tutors for one-on-one and group sessions. Escrow-protected payments.",
  openGraph: {
    title: 'TutorCourt — Find Expert Tutors in Nigeria',
    description: "Nigeria's trusted tutoring marketplace. Connect with vetted, expert K-12 tutors.",
    type: 'website',
    url: 'https://www.tutorcourt.com',
    images: [{ url: 'https://www.tutorcourt.com/api/og?type=default', width: 1200, height: 630, alt: 'TutorCourt' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TutorCourt — Find Expert Tutors in Nigeria',
    description: "Nigeria's trusted tutoring marketplace.",
    images: ['https://www.tutorcourt.com/api/og?type=default'],
  },
  alternates: { canonical: 'https://www.tutorcourt.com' },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'TutorCourt',
  url: 'https://www.tutorcourt.com',
  logo: 'https://www.tutorcourt.com/logo-main.png',
  description: "Nigeria's trusted tutoring marketplace connecting K-12 students with vetted expert tutors.",
  foundingLocation: {
    '@type': 'Place',
    addressCountry: 'NG',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    url: 'https://www.tutorcourt.com',
  },
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'TutorCourt',
  url: 'https://www.tutorcourt.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.tutorcourt.com/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

export default async function HomePage() {
  return (
    <>
      <JsonLd data={[organizationSchema, websiteSchema]} />
      <SiteHero />
      <HighlyRatedTutors />
      <HowItWorks />
      <FeaturesSection />
      <ReviewsSection />
      <FaqSection />
      <CallToAction />
    </>
  )
}

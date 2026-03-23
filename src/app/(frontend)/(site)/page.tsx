import React from 'react'
import { SiteHero } from '@/components/site/hero'
import { HighlyRatedTutors } from '@/components/site/highly-rated-tutors'
import { ReviewsSection } from '@/components/site/reviews'
import { HowItWorks } from '@/components/site/how-it-works'
import { FaqSection } from '@/components/site/faq'
import { CallToAction } from '@/components/site/cta'

export default async function HomePage() {
  return (
    <>
      <SiteHero />
      <HighlyRatedTutors />
      <HowItWorks />
      <ReviewsSection />
      <FaqSection />
      <CallToAction />
    </>
  )
}

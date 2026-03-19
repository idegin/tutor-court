import React from 'react'
import { HomeFooter } from '@/components/home-page/home-footer'
import { HomeHeader } from '@/components/home-page/home-header'
import { HeroSection } from '@/components/home-page/hero-section'

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <HomeHeader />
      <HeroSection />
      <HomeFooter />
    </div>
  )
}

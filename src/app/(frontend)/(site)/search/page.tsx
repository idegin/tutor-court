import React from 'react'
import { SearchClient } from '@/components/search/search-client'

export const metadata = {
    title: 'Search Tutors | TutorCourt',
    description: 'Find the perfect tutor for your academic journey.',
}

export default function SearchPage() {
    return (
        <div className="min-h-screen bg-background pt-8 pb-24 relative overflow-hidden">
            {/* Decorative background shape from image */}
            <div className="absolute top-0 left-0 w-[40%] h-full bg-tutor-purple-50 dark:bg-tutor-purple-950/20 -z-0 rounded-br-[10rem] pointer-events-none" />

            <SearchClient />
        </div>
    )
}

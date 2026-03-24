import React from 'react'
import { SearchClient } from '@/components/search/search-client'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const metadata = {
    title: 'Search Tutors | TutorCourt',
    description: 'Find the perfect tutor for your academic journey.',
}

export default async function SearchPage() {
    const payload = await getPayload({ config: configPromise });

    // Fetch all approved tutors
    const { docs: tutorDocs } = await payload.find({
        collection: 'tutor-profiles',
        where: {
            isApproved: { equals: true }
        },
        limit: 20,
        depth: 2
    });

    const tutors = tutorDocs.map((doc: any) => {
        const user = doc.user;
        const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonymous Tutor';

        return {
            id: doc.id,
            slug: doc.slug,
            name: fullName,
            pricePerHour: doc.hourlyRate || 0,
            rating: doc.rating || 0,
            reviewCount: doc.totalReviews || 0,
            description: doc.headline || doc.bio?.substring(0, 150) + '...' || 'Professional Tutor',
            tags: doc.subjects?.map((s: any) => s.name?.toUpperCase()) || [],
            imageUrl: user?.avatar?.url || `https://i.pravatar.cc/300?u=${doc.id}`,
            isVerified: doc.isApproved || false,
        };
    });

    return (
        <div className="min-h-screen bg-background pt-8 pb-24 relative overflow-hidden">
            {/* Decorative background shape from image */}
            <div className="absolute top-0 left-0 w-[40%] h-full bg-tutor-purple-50 dark:bg-tutor-purple-950/20 -z-0 rounded-br-[10rem] pointer-events-none" />

            <SearchClient tutors={tutors} />
        </div>
    )
}

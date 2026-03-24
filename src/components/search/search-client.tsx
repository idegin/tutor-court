'use client';

import React, { useState } from 'react';
import { HiListBullet, HiSquares2X2 } from 'react-icons/hi2';
import { SearchFilters } from '@/components/search/search-filters';
import { TutorCard, TutorCardProps } from '@/components/tutors/tutor-card';

const dummyTutors: TutorCardProps[] = [
    {
        id: '1',
        name: 'Dr. Amina Okoro',
        pricePerHour: 12500,
        rating: 5,
        reviewCount: 128,
        description: 'PhD in Theoretical Mathematics with over 10 years of experience helping students bridge the gap between abstract concepts and practical problem-solving. Specialized in WAEC, JAMB, and IGCSE preparation.',
        tags: ['CALCULUS', 'ALGEBRA', 'STATISTICS'],
        imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800',
        isVerified: true,
        viewMode: 'list'
    },
    {
        id: '2',
        name: 'Mr. Tunde Bakare',
        pricePerHour: 8000,
        rating: 5,
        reviewCount: 84,
        description: 'Dedicated math enthusiast focused on making learning fun for secondary school students. I use visual aids and interactive tools to ensure no student is left behind in competitive exams.',
        tags: ['FURTHER MATHS', 'GEOMETRY'],
        imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
        isVerified: true,
        viewMode: 'list'
    },
    {
        id: '3',
        name: 'Chioma Adeyemi',
        pricePerHour: 15000,
        rating: 5,
        reviewCount: 42,
        description: 'Specializing in University level Engineering Mathematics and Advanced Calculus. I provide personalized study plans and weekly progress reports to help you ace your degree.',
        tags: ['DIFFERENTIAL EQUATIONS', 'TRIGONOMETRY'],
        imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800',
        isVerified: false,
        viewMode: 'list'
    }
];

export function SearchClient() {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    return (
        <div className="container mx-auto max-w-7xl relative z-10 flex flex-col md:flex-row gap-8">
            {/* Left Sidebar */}
            <SearchFilters />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Header Options */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-2">142 Tutors found</h1>
                        <p className="text-lg font-bold text-muted-foreground">Showing top-rated Mathematics specialists in Lagos</p>
                    </div>

                    <div className="flex items-center gap-2 bg-muted p-1.5 rounded-2xl border-2 border-transparent relative z-20 w-fit">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-card border-2 border-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <HiListBullet className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-card border-2 border-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <HiSquares2X2 className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Tutor List / Grid */}
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-6'}>
                    {dummyTutors.map(tutor => (
                        <TutorCard key={tutor.id} {...tutor} viewMode={viewMode} />
                    ))}
                </div>

                {/* Load More Button */}
                <div className="flex flex-col items-center mt-12 mb-12">
                    <button className="px-8 py-4 rounded-full border-[3px] border-primary text-primary font-black hover:bg-primary/5 transition-colors">
                        LOAD MORE TUTORS
                    </button>

                    {/* Pagination dots below load more like in UI design */}
                    <div className="flex gap-2 mt-6">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    </div>
                </div>
            </div>
        </div>
    );
}

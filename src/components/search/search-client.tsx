'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { HiListBullet, HiSquares2X2 } from 'react-icons/hi2';
import { SearchFilters } from '@/components/search/search-filters';
import { TutorCard, TutorCardProps } from '@/components/tutors/tutor-card';
import { fetchTutors } from '@/app/(frontend)/(site)/search/actions';
import { HiArrowPath } from 'react-icons/hi2';

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

export interface SearchClientProps {
    initialTutors?: Omit<TutorCardProps, 'viewMode'>[];
    totalDocs?: number;
    initialHasNextPage?: boolean;
    searchParams?: any;
}

export function SearchClient({ initialTutors = [], totalDocs = 0, initialHasNextPage = false, searchParams = {} }: SearchClientProps) {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [tutors, setTutors] = useState(initialTutors);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
    const [loading, setLoading] = useState(false);

    // Sync initial tutors if search parameters change from server
    useEffect(() => {
        setTutors(initialTutors);
        setPage(1);
        setHasNextPage(initialHasNextPage);
    }, [initialTutors, initialHasNextPage]);

    const handleLoadMore = async () => {
        if (loading || !hasNextPage) return;
        setLoading(true);
        try {
            const nextPage = page + 1;
            const res = await fetchTutors(searchParams, nextPage);
            setTutors(prev => [...prev, ...res.tutors]);
            setHasNextPage(res.hasNextPage);
            setPage(nextPage);
        } catch (error) {
            console.error('Failed to load more tutors', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto max-w-7xl relative z-10 flex flex-col md:flex-row md:items-start gap-8">
            {/* Left Sidebar */}
            <Suspense fallback={<div className="w-full md:w-80 h-[calc(100vh-4rem)] sticky top-8 bg-card rounded-2xl border-2 border-muted animate-pulse" />}>
                <SearchFilters />
            </Suspense>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Header Options */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-2">{totalDocs} Tutors found</h1>
                        <p className="text-lg font-bold text-muted-foreground">Showing top-rated specialists matching your criteria</p>
                    </div>

                    <div className="flex items-center gap-2 bg-muted p-1.5 rounded-2xl border-2 border-transparent relative z-20 w-fit">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-card border-none text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <HiListBullet className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-card border-none text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <HiSquares2X2 className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {tutors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center bg-card rounded-2xl border-2 border-muted p-16 text-center mt-4">
                        <div className="w-24 h-24 mb-6 rounded-full bg-tutor-purple-50 flex items-center justify-center">
                            <span className="text-4xl">🔍</span>
                        </div>
                        <h2 className="text-2xl font-black text-foreground mb-2">No tutors found</h2>
                        <p className="text-muted-foreground font-medium max-w-md">We couldn't find any tutors matching your current filters. Try adjusting your search criteria or clearing filters.</p>
                    </div>
                ) : (
                    <>
                        {/* Tutor List / Grid */}
                        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-6'}>
                            {tutors.map(tutor => (
                                <TutorCard key={tutor.id} {...tutor} viewMode={viewMode} />
                            ))}
                        </div>

                        {/* Load More Button */}
                        {hasNextPage && (
                            <div className="flex flex-col items-center mt-12 mb-12">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loading}
                                    className="px-8 py-4 rounded-xl bg-muted text-foreground font-black hover:bg-tutor-purple-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? <><HiArrowPath className="w-5 h-5 animate-spin" /> LOADING...</> : 'LOAD MORE TUTORS'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { HiListBullet, HiSquares2X2, HiOutlineAdjustmentsHorizontal } from 'react-icons/hi2';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SearchFilters } from '@/components/search/search-filters';
import { TutorCard, TutorCardProps } from '@/components/tutors/tutor-card';
import { fetchTutors } from '@/app/(frontend)/(site)/search/actions';
import { HiArrowPath } from 'react-icons/hi2';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const SORT_OPTIONS = [
    { value: '-rating', label: 'Highest rated' },
    { value: 'hourlyRate', label: 'Price: low to high' },
    { value: '-hourlyRate', label: 'Price: high to low' },
    { value: '-totalReviews', label: 'Most reviews' },
    { value: '-createdAt', label: 'Newest' },
];

export interface SearchClientProps {
    initialTutors?: Omit<TutorCardProps, 'viewMode'>[];
    totalDocs?: number;
    initialHasNextPage?: boolean;
    searchParams?: any;
}

export function SearchClient({ initialTutors = [], totalDocs = 0, initialHasNextPage = false, searchParams = {} }: SearchClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const urlParams = useSearchParams();

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [showFilters, setShowFilters] = useState(false);
    const [tutors, setTutors] = useState(initialTutors);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
    const [loading, setLoading] = useState(false);

    const currentSort = urlParams.get('sort') || '-rating';

    const handleSortChange = (value: string) => {
        const params = new URLSearchParams(urlParams.toString());
        params.set('sort', value);
        router.push(`${pathname}?${params.toString()}`);
    };

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
        <div className="container mx-auto max-w-7xl px-4 md:px-6 relative z-10 flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
            {/* Mobile Filters Toggle */}
            <button
                onClick={() => setShowFilters(prev => !prev)}
                className="md:hidden flex items-center justify-center gap-2 w-full bg-card border-2 border-muted rounded-2xl py-3 font-black text-foreground text-sm"
            >
                <HiOutlineAdjustmentsHorizontal className="w-5 h-5" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>

            {/* Left Sidebar */}
            <Suspense fallback={<div className="hidden md:block w-full md:w-80 h-[calc(100vh-4rem)] sticky top-8 bg-card rounded-2xl border-2 border-muted animate-pulse" />}>
                <div className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-80 flex-shrink-0`}>
                    <SearchFilters />
                </div>
            </Suspense>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Options */}
                <div className="flex flex-col gap-3 mb-6 md:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground mb-1 leading-tight">{totalDocs} Tutors found</h1>
                            <p className="text-sm md:text-base font-medium text-muted-foreground">Showing top-rated specialists matching your criteria</p>
                        </div>

                        <div className="flex items-center gap-2 relative z-20 shrink-0">
                            <Select value={currentSort} onValueChange={handleSortChange}>
                                <SelectTrigger className="w-[150px] sm:w-[180px] rounded-xl font-bold text-sm">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SORT_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border-2 border-transparent w-fit">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <HiListBullet className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <HiSquares2X2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
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

'use client';

import React, { useState, useMemo } from 'react';
import { HiStar, HiUser } from 'react-icons/hi2';
import { formatDistanceToNow } from 'date-fns';

export interface ReviewData {
    id: string;
    rating: number;
    review: string;
    createdAt: string;
    tutorResponse?: string;
    user: {
        firstName?: string;
        lastName?: string;
        avatarUrl?: string;
    };
}

interface TutorReviewsProps {
    reviews: ReviewData[];
    overallRating: number;
    totalReviews: number;
}

export function TutorReviews({ reviews, overallRating, totalReviews }: TutorReviewsProps) {
    const [filterRating, setFilterRating] = useState<number | null>(null);

    const filteredReviews = useMemo(() => {
        if (!filterRating) return reviews;
        return reviews.filter(r => Math.round(r.rating) === filterRating);
    }, [reviews, filterRating]);

    // Compute rating distribution
    const ratingCounts = useMemo(() => {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(r => {
            const rounded = Math.round(r.rating);
            if (rounded >= 1 && rounded <= 5) {
                counts[rounded] += 1;
            }
        });
        return counts;
    }, [reviews]);

    if (reviews.length === 0) {
        return (
            <div className="bg-card rounded-[2rem] border-[3px] border-foreground p-8">
                <h3 className="text-2xl font-black text-foreground mb-4">Student Reviews</h3>
                <p className="text-muted-foreground text-lg">This tutor hasn&apos;t received any reviews yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-[2rem] border-[3px] border-foreground p-6 sm:p-10 mb-12">
            <h3 className="text-3xl font-black text-foreground mb-8">Student Reviews</h3>

            <div className="flex flex-col md:flex-row gap-12 mb-10">
                {/* Overall Rating Score */}
                <div className="flex flex-col items-center justify-center min-w-[200px] bg-tutor-purple-100 rounded-[1.5rem] border-[3px] border-foreground p-6">
                    <div className="text-6xl font-black text-foreground tracking-tight mb-2">
                        {overallRating % 1 === 0 ? overallRating : overallRating.toFixed(1)}
                    </div>
                    <div className="flex text-yellow-400 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <HiStar key={star} className="w-8 h-8" />
                        ))}
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">Based on {totalReviews} review{totalReviews !== 1 && 's'}</p>
                </div>

                {/* Rating Bars */}
                <div className="flex-1 flex flex-col justify-center gap-3">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = ratingCounts[star] || 0;
                        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                        return (
                            <button
                                key={star}
                                onClick={() => setFilterRating(filterRating === star ? null : star)}
                                className={`flex items-center gap-3 w-full group transition-opacity ${filterRating && filterRating !== star ? 'opacity-40' : 'hover:opacity-80'}`}
                            >
                                <div className="flex items-center gap-1 w-12 shrink-0">
                                    <span className="font-bold text-foreground">{star}</span>
                                    <HiStar className="w-4 h-4 text-yellow-400" />
                                </div>
                                <div className="flex-1 h-4 bg-muted border-2 border-foreground rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-tutor-purple-400 border-r-2 border-foreground last:border-r-0"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="w-8 shrink-0 text-right text-sm font-bold text-muted-foreground">
                                    {count}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {filterRating && (
                <div className="mb-6 flex items-center justify-between">
                    <div className="font-bold text-foreground">
                        Showing {filterRating}-star reviews ({filteredReviews.length})
                    </div>
                    <button
                        onClick={() => setFilterRating(null)}
                        className="text-tutor-red-500 font-bold hover:underline"
                    >
                        Clear filter
                    </button>
                </div>
            )}

            {/* Reviews List */}
            <div className="flex flex-col gap-6">
                {filteredReviews.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-lg font-bold text-muted-foreground">No reviews matched this filter.</p>
                    </div>
                ) : (
                    filteredReviews.map((review) => (
                        <div key={review.id} className="border-b-2 border-border pb-6 last:border-b-0 last:pb-0">
                            <div className="flex items-start gap-4 mb-4">
                                {review.user.avatarUrl ? (
                                    <img src={review.user.avatarUrl} alt="User avatar" className="w-12 h-12 rounded-full border-2 border-foreground object-cover" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full border-2 border-foreground bg-tutor-purple-200 flex items-center justify-center font-bold text-lg text-foreground">
                                        {review.user.firstName ? review.user.firstName.charAt(0) : <HiUser className="w-6 h-6" />}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-foreground text-lg">
                                                {review.user.firstName} {review.user.lastName}
                                            </h4>
                                            <p className="text-sm font-medium text-muted-foreground">
                                                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <div className="flex text-yellow-400">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <HiStar
                                                    key={star}
                                                    className={`w-5 h-5 ${star <= review.rating ? 'text-yellow-400' : 'text-muted opacity-30'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-foreground text-lg leading-relaxed whitespace-pre-wrap ml-16">
                                {review.review}
                            </div>

                            {/* Tutor Response */}
                            {review.tutorResponse && (
                                <div className="mt-4 ml-16 bg-muted/50 rounded-2xl border-2 border-border p-5 relative">
                                    {/* Small pointer tail */}
                                    <div className="absolute -top-[10px] left-6 w-4 h-4 bg-muted/50 border-t-2 border-l-2 border-border rotate-45" />
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-tutor-purple-600">Response from Tutor</span>
                                    </div>
                                    <p className="text-foreground whitespace-pre-wrap">
                                        {review.tutorResponse}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

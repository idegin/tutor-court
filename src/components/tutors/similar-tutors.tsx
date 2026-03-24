import React from 'react';
import { TutorCardCompact, TutorCardCompactProps } from './tutor-card-compact';
import Link from 'next/link';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel";

export interface SimilarTutorsProps {
    tutors: TutorCardCompactProps[];
}

export function SimilarTutors({ tutors }: SimilarTutorsProps) {
    if (!tutors || tutors.length === 0) return null;

    return (
        <section className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h4 className="text-sm font-black text-tutor-red-500 tracking-widest uppercase mb-2">Curated for you</h4>
                    <h2 className="text-3xl md:text-4xl font-black text-foreground">Similar Tutors</h2>
                </div>
                <Link href="/tutors" className="inline-flex items-center gap-2 font-bold text-foreground border-b-2 border-primary hover:text-primary transition-colors pb-1">
                    View All Experts
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
            </div>

            <div className="mt-4 relative">
                <Carousel
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-4">
                        {tutors.map((tutor) => (
                            <CarouselItem key={tutor.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                                <TutorCardCompact {...tutor} />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <div className="hidden sm:block">
                    </div>
                </Carousel>
            </div>
        </section>
    );
}

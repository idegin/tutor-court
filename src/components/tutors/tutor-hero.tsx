import React from 'react';
import Image from 'next/image';
import { HiStar, HiCheckBadge } from 'react-icons/hi2';

export interface TutorHeroProps {
    name: string;
    title: string;
    rating: number;
    reviews: number;
    pricePerHour: number;
    imageUrl: string;
    coverImageUrl: string;
    isVerified: boolean;
}

export function TutorHero({
}: TutorHeroProps) {
    return (
        <div className="w-full relative bg-background">
            <div className="md:h-[300px] h-[200px] w-full relative rounded-bl-[2rem] rounded-br-[2rem] overflow-hidden">
                <img
                    src={'/banner.png'}
                    alt="Cover"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-[-80px] md:mt-[-100px] relative z-10">

            </div>
        </div>
    );
}

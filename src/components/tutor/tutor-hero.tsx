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
    name,
    title,
    rating,
    reviews,
    pricePerHour,
    imageUrl,
    coverImageUrl,
    isVerified
}: TutorHeroProps) {
    return (
        <div className="w-full relative bg-background">
            <div className="md:h-[300px] h-[200px] w-full relative rounded-bl-[2rem] rounded-br-[2rem] overflow-hidden">
                <img
                    src={coverImageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                />
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-[-80px] md:mt-[-100px] relative z-10">
                <div className="bg-card rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center md:items-end gap-6 border-[3px] border-foreground">
                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-[2rem] border-[3px] border-foreground overflow-hidden bg-primary shrink-0">
                        <img
                            src={imageUrl}
                            alt={name}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="flex-grow flex flex-col md:flex-row justify-between w-full pb-2 md:pb-0 gap-6">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-4 flex-wrap">
                                {isVerified && (
                                    <div className="flex items-center gap-1 bg-primary px-3 py-1 rounded-full border-2 border-foreground">
                                        <HiCheckBadge className="text-foreground w-4 h-4" />
                                        <span className="text-xs font-black tracking-widest text-foreground uppercase">Verified Expert</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    <HiStar className="text-tutor-red-500 w-5 h-5" />
                                    <span className="font-extrabold text-tutor-red-500">{rating.toFixed(1)}/5</span>
                                    <span className="font-medium text-muted-foreground">({reviews} reviews)</span>
                                </div>
                            </div>

                            <h1 className="text-3xl md:text-5xl font-black text-foreground">{name}</h1>
                            <p className="text-lg md:text-xl font-bold text-muted-foreground">{title}</p>
                        </div>

                        <div className="flex flex-col items-start md:items-end gap-3 justify-end shrink-0">
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl md:text-4xl font-black text-foreground">₦{pricePerHour.toLocaleString()}</span>
                                <span className="text-lg font-bold text-muted-foreground">/hr</span>
                            </div>
                            <button className="w-full md:w-auto bg-tutor-red-500 hover:bg-tutor-red-600 text-white font-black py-3 px-8 rounded-xl border-[3px] border-foreground transition-colors text-lg">
                                Book Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

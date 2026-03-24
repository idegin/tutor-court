import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiStar } from 'react-icons/hi2';

export interface TutorCardCompactProps {
    id: string;
    name: string;
    title: string;
    rating: number;
    priceText: string;
    imageUrl: string;
}

export function TutorCardCompact({ id, name, title, rating, priceText, imageUrl }: TutorCardCompactProps) {
    return (
        <div className="bg-card rounded-[2rem] p-4 flex flex-col gap-4 border-[3px] border-foreground">
            <div className="relative w-full aspect-square rounded-[1.5rem] border-[3px] border-foreground overflow-hidden bg-muted">
                <img
                    src={imageUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-card px-3 py-1 rounded-full border-2 border-foreground">
                    <span className="text-xs font-black text-foreground">{priceText}</span>
                </div>
            </div>

            <div className="flex flex-col gap-1 px-1">
                <div className="flex justify-between items-start gap-2">
                    <h3 className="text-lg font-black text-foreground line-clamp-1">{name}</h3>
                    <div className="flex items-center gap-1 shrink-0 mt-1">
                        <HiStar className="w-4 h-4 text-tutor-red-500" />
                        <span className="text-sm font-extrabold text-tutor-red-500">{rating.toFixed(1)}</span>
                    </div>
                </div>
                <p className="text-sm font-bold text-muted-foreground line-clamp-1">{title}</p>
            </div>

            <Link
                href={`/tutor/${id}`}
                className="w-full mt-2 text-center bg-tutor-purple-50 hover:bg-tutor-purple-100 text-tutor-purple-800 font-black py-3 px-4 rounded-xl border-[3px] border-foreground transition-colors"
            >
                View Profile
            </Link>
        </div>
    );
}

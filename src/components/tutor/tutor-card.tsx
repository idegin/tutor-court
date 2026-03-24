import React from 'react'
import { HiStar, HiCheckBadge } from 'react-icons/hi2'
import Link from 'next/link'

export interface TutorCardProps {
    id: string;
    name: string;
    pricePerHour: number;
    rating: number;
    reviewCount: number;
    description: string;
    tags: string[];
    imageUrl: string;
    isVerified: boolean;
    viewMode: 'list' | 'grid';
}

export function TutorCard({
    id,
    name,
    pricePerHour,
    rating,
    reviewCount,
    description,
    tags,
    imageUrl,
    isVerified,
    viewMode
}: TutorCardProps) {
    const isGrid = viewMode === 'grid';

    return (
        <div className={`flex bg-card rounded-[2rem] border-[3px] border-foreground overflow-hidden ${isGrid ? 'flex-col' : 'flex-col md:flex-row p-6 md:p-8 gap-6 md:gap-8'} mb-6`}>
            {/* Image Section */}
            <div className={`relative flex-shrink-0 ${isGrid ? 'h-64 border-b-[3px] border-foreground' : 'w-full md:w-64 h-64 md:h-auto rounded-[1.5rem] border-[3px] border-foreground overflow-hidden'}`}>
                <img
                    src={imageUrl}
                    alt={name}
                    className="w-full h-full object-cover bg-muted"
                />
                {isVerified && (
                    <div className={`absolute ${isGrid ? 'bottom-4 right-4' : '-bottom-4 -right-4'} bg-primary px-4 py-1.5 rounded-full border-[3px] border-foreground`}>
                        <span className="text-xs font-black text-foreground tracking-wider">VERIFIED</span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className={`flex flex-col flex-grow ${isGrid ? 'p-6' : ''}`}>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2 gap-2">
                    <div>
                        <h3 className="text-2xl font-black text-foreground">{name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <HiStar key={i} className={`w-5 h-5 ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-muted'}`} />
                                ))}
                            </div>
                            <span className="text-sm font-bold text-muted-foreground">({reviewCount} reviews)</span>
                        </div>
                    </div>
                    <div className={`text-left md:text-right ${isGrid ? 'mt-2' : ''}`}>
                        <div className="text-2xl font-black text-foreground flex items-baseline md:justify-end gap-1">
                            <span>₦{pricePerHour.toLocaleString()}</span>
                        </div>
                        <div className="text-sm font-bold text-muted-foreground tracking-wider">PER HOUR</div>
                    </div>
                </div>

                <p className="text-muted-foreground font-medium mb-6 line-clamp-3">
                    {description}
                </p>

                <div className="flex flex-wrap gap-2 mb-8">
                    {tags.map((tag, idx) => (
                        <span key={idx} className="px-4 py-1.5 bg-primary/10 text-primary font-bold text-xs rounded-full border-2 border-primary/20">
                            {tag.toUpperCase()}
                        </span>
                    ))}
                </div>

                <div className={`flex gap-4 mt-auto ${isGrid ? 'flex-col' : 'flex-col sm:flex-row'}`}>
                    <Link href={`/tutors/${id}`} className={`flex-1 text-center bg-tutor-red-500 hover:bg-tutor-red-600 text-white font-black py-3 px-6 rounded-xl border-[3px] border-foreground transition-colors`}>
                        Book Now
                    </Link>
                    <Link href={`/tutors/${id}`} className={`flex-1 text-center bg-card hover:bg-muted text-foreground font-black py-3 px-6 rounded-xl border-[3px] border-foreground transition-colors`}>
                        View Profile
                    </Link>
                </div>
            </div>
        </div>
    )
}

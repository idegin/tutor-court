import React from 'react';
import { HiStar, HiChevronRight } from 'react-icons/hi2';
import Link from 'next/link';
import { getPayload } from 'payload';
import configPromise from '@payload-config';
import { unstable_cache } from 'next/cache';

const getHighlyRatedTutors = async () => {
    const payload = await getPayload({ config: configPromise });
    const { docs: tutors } = await payload.find({
        collection: 'tutor-profiles',
        where: {
            isApproved: { equals: true },
        },
        sort: '-rating',
        limit: 30,
        depth: 2,
    });
    return tutors;
};

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

const getName = (user: any) => {
    if (!user) return 'Tutor';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Tutor';
};

const getAvatar = (user: any) => {
    if (user?.avatar?.url) return user.avatar.url;
    return "/user-placeholder.png";
};

const getRating = (tutor: any) => (tutor.rating || 0).toFixed(1);
const getReviews = (tutor: any) => tutor.totalReviews || 0;
const getHourlyRate = (tutor: any) => (tutor.hourlyRate || 0).toLocaleString();

export async function HighlyRatedTutors() {
    const tutors = await getHighlyRatedTutors();

    if (!tutors || tutors.length <= 3) {
        return null;
    }

    const shuffledTutors = shuffleArray(tutors).slice(0, 3);
    const [mainTutor, smallTutor1, smallTutor2] = shuffledTutors;

    const mainNameParts = getName(mainTutor.user).split(' ');
    const mainNameFirst = mainNameParts[0] || '';
    const mainNameRest = mainNameParts.slice(1).join(' ');

    const mainTags = (mainTutor.subjects as any[] || []).slice(0, 2).map((s: any) => s?.name || s);

    return (
        <section className="py-24 px-4 md:px-8 bg-background">
            <div className="container mx-auto max-w-7xl">
                <div className="mb-12">
                    <h3 className="text-xs font-black tracking-widest text-tutor-red-500 uppercase mb-3">
                        Elite Educators
                    </h3>
                    <h2 className="text-4xl md:text-5xl font-black text-foreground max-w-2xl leading-tight">
                        Highest Rated Tutors This Month
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* Main Large Card */}
                    <div className="lg:col-span-8 bg-primary/10 rounded-[2rem] border-2 border-foreground p-6 md:p-10 flex flex-col md:flex-row gap-8">
                        {/* Image Side */}
                        <div className="w-full md:w-5/12 flex-shrink-0 relative flex items-center justify-center">
                            {/* Tilted frame mimicking rotation */}
                            <div className="relative w-full aspect-[4/5] max-w-[320px] mx-auto group">
                                <div className="absolute inset-0 bg-secondary rounded-[2.5rem] border-2 border-foreground overflow-hidden">
                                    <img
                                        src={getAvatar(mainTutor.user)}
                                        alt={getName(mainTutor.user)}
                                        className="w-full h-full object-cover opacity-90"
                                    />
                                </div>
                                {/* Rating Badge */}
                                <div className="absolute bottom-6 left-[-10px] md:left-[-15px] bg-card border-2 border-foreground rounded-full px-5 py-2.5 flex items-center gap-1.5 z-10">
                                    <HiStar className="w-4 h-4 text-tutor-red-500" />
                                    <span className="text-sm font-bold text-card-foreground">{getRating(mainTutor)} <span className="text-sm font-semibold text-foreground">({getReviews(mainTutor)} reviews)</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Content Side */}
                        <div className="w-full md:w-7/12 flex flex-col justify-center">
                            {mainTags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    {mainTags[0] && (
                                        <span className="px-3 py-1.5 bg-primary text-foreground text-[10px] font-bold tracking-wider uppercase rounded-full">
                                            {mainTags[0]}
                                        </span>
                                    )}
                                    {mainTags[1] && (
                                        <span className="px-3 py-1.5 bg-tutor-purple-200 text-foreground text-[10px] font-bold tracking-wider uppercase rounded-full">
                                            {mainTags[1]}
                                        </span>
                                    )}
                                </div>
                            )}

                            <h3 className="text-4xl md:text-5xl font-black text-card-foreground leading-tight mb-4">
                                {mainNameFirst} {mainNameRest && <br />}{mainNameRest}
                            </h3>

                            <p className="text-muted-foreground font-medium leading-relaxed mb-8 line-clamp-6">
                                {mainTutor.bio || mainTutor.headline}
                            </p>

                            <div className="mt-auto">
                                <p className="text-sm font-bold text-muted-foreground/60 mb-1">Hourly Rate</p>
                                <div className="text-3xl font-black text-card-foreground mb-6 flex items-baseline">
                                    ₦{getHourlyRate(mainTutor)}<span className="text-base font-semibold text-muted-foreground/60 ml-0.5">/hr</span>
                                </div>
                                <Link
                                    href={`/tutors/${mainTutor.slug}`}
                                    className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full font-bold hover:bg-tutor-red-500 transition-colors"
                                >
                                    Book Now <HiChevronRight className="w-5 h-5 stroke-[3]" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Smaller Cards Column */}
                    <div className="lg:col-span-4 flex flex-col gap-6">

                        {/* Small Card 1 */}
                        <div className="bg-card rounded-[2rem] border-2 border-foreground p-6 md:p-8 flex flex-col h-full">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-tutor-purple-100 border-2 border-foreground rounded-[1.2rem] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    <img
                                        src={getAvatar(smallTutor1.user)}
                                        alt={getName(smallTutor1.user)}
                                        className="w-full h-full object-cover opacity-90"
                                    />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-card-foreground leading-none mb-1">{getName(smallTutor1.user)}</h4>
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <HiStar className="w-3.5 h-3.5 text-tutor-red-500" />
                                        <span className="text-xs font-bold text-card-foreground">{getRating(smallTutor1)} <span className="text-foreground font-semibold">({getReviews(smallTutor1)} reviews)</span></span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-6 flex-grow line-clamp-4 overflow-hidden text-ellipsis">
                                {smallTutor1.bio || smallTutor1.headline || "Patient and experienced tutor dedicated to student success."}
                            </p>

                            <div className="flex items-baseline justify-between mt-auto">
                                <div className="text-xl font-black text-card-foreground flex items-baseline">
                                    ₦{getHourlyRate(smallTutor1)}<span className="text-sm font-semibold text-muted-foreground/60 ml-0.5">/hr</span>
                                </div>
                                <Link href={`/tutors/${smallTutor1.slug}`} className="flex items-center gap-1 text-sm font-black text-card-foreground hover:text-primary transition-colors">
                                    Profile <HiChevronRight className="w-4 h-4 stroke-[3]" />
                                </Link>
                            </div>
                        </div>

                        {/* Small Card 2 */}
                        <div className="bg-tutor-purple-50 rounded-[2rem] border-2 border-foreground p-6 md:p-8 flex flex-col h-full">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-tutor-red-100 border-2 border-foreground rounded-[1.2rem] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    <img
                                        src={getAvatar(smallTutor2.user)}
                                        alt={getName(smallTutor2.user)}
                                        className="w-full h-full object-cover opacity-90"
                                    />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-card-foreground leading-none mb-1">{getName(smallTutor2.user)}</h4>
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <HiStar className="w-3.5 h-3.5 text-tutor-red-500" />
                                        <span className="text-xs font-bold text-card-foreground">{getRating(smallTutor2)} <span className="text-foreground font-semibold">({getReviews(smallTutor2)} reviews)</span></span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-6 flex-grow line-clamp-4 overflow-hidden text-ellipsis">
                                {smallTutor2.bio || smallTutor2.headline || "Helping students master complex topics with personalized guidance."}
                            </p>

                            <div className="flex items-baseline justify-between mt-auto">
                                <div className="text-xl font-black text-card-foreground flex items-baseline">
                                    ₦{getHourlyRate(smallTutor2)}<span className="text-sm font-semibold text-muted-foreground/60 ml-0.5">/hr</span>
                                </div>
                                <Link href={`/tutors/${smallTutor2.slug}`} className="flex items-center gap-1 text-sm font-black text-card-foreground hover:text-primary transition-colors">
                                    Profile <HiChevronRight className="w-4 h-4 stroke-[3]" />
                                </Link>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}


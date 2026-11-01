import React from 'react';
import type { Metadata } from 'next';
import { TutorHero } from '@/components/tutors/tutor-hero';
import { TutorAbout } from '@/components/tutors/tutor-about';
import { TutorBookingSidebar } from '@/components/tutors/tutor-booking-sidebar';
import { SimilarTutors } from '@/components/tutors/similar-tutors';
import { HiBeaker } from 'react-icons/hi2';
import { getPayload } from 'payload';
import configPromise from '@payload-config';
import { notFound } from 'next/navigation';
import { getServerSideUser } from '@/lib/auth';
import { TutorReviews } from '@/components/tutors/tutor-reviews';
import { JsonLd } from '@/components/seo/json-ld';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const payload = await getPayload({ config: configPromise });
    const isById = /^\d+$/.test(decodedSlug) || /^[0-9a-fA-F]{24}$/.test(decodedSlug);

    const { docs } = await payload.find({
        collection: 'tutor-profiles',
        where: isById ? { id: { equals: decodedSlug } } : { slug: { equals: decodedSlug } },
        depth: 2,
    });

    const profile = docs[0] as any;
    if (!profile) return { title: 'Tutor Not Found | TutorCourt' };

    const user = profile.user;
    const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Expert Tutor';
    const subjects = (profile.subjects ?? []).map((s: any) => s.name ?? s).filter(Boolean).slice(0, 3).join(', ');
    const bio = profile.bio ? profile.bio.slice(0, 155) : `${fullName} is a verified tutor on TutorCourt.`;
    const avatarUrl = user?.avatar?.url ?? '';
    const headline = profile.headline ?? 'Professional Tutor';

    const ogUrl = `/api/og?type=tutor&name=${encodeURIComponent(fullName)}&headline=${encodeURIComponent(headline)}&subjects=${encodeURIComponent(subjects)}&imageUrl=${encodeURIComponent(avatarUrl)}&isVerified=${profile.isVerified ?? false}`;

    return {
        title: `${fullName} — ${subjects || 'Tutor'} | TutorCourt`,
        description: bio,
        openGraph: {
            title: `${fullName} — ${subjects || 'Tutor'} | TutorCourt`,
            description: bio,
            type: 'profile',
            url: `https://www.tutorcourt.com/tutors/${decodedSlug}`,
            images: [{ url: ogUrl, width: 1200, height: 630, alt: fullName }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${fullName} | TutorCourt`,
            description: bio,
            images: [ogUrl],
        },
        alternates: { canonical: `https://www.tutorcourt.com/tutors/${decodedSlug}` },
    };
}

export default async function TutorDetailsPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ rebook?: string }>;
}) {
    const { slug } = await params;
    const { rebook } = await searchParams;
    const decodedSlug = decodeURIComponent(slug);
    const payload = await getPayload({ config: configPromise });
    const { user: currentUser } = await getServerSideUser();

    const isById = /^\d+$/.test(decodedSlug) || /^[0-9a-fA-F]{24}$/.test(decodedSlug);

    const { docs } = await payload.find({
        collection: 'tutor-profiles',
        where: isById ? { id: { equals: decodedSlug } } : { slug: { equals: decodedSlug } },
        depth: 2
    });

    const tutorProfile = docs[0] as any;

    if (!tutorProfile) {
        return notFound();
    }

    const profileUserId = tutorProfile.user?.id ?? tutorProfile.user;
    const isOwnerOrAdmin =
        !!currentUser &&
        (currentUser.accountType === 'admin' || String(profileUserId) === String(currentUser.id));
    if (!tutorProfile.isApproved && !isOwnerOrAdmin) {
        return notFound();
    }

    let hasActiveBooking = false;
    let parentChildren: { id: string; name: string }[] = [];
    if (currentUser) {
        if (currentUser.accountType === 'student') {
            const activeBookings = await payload.find({
                collection: 'bookings',
                where: {
                    and: [
                        { tutor: { equals: tutorProfile.id } },
                        { student: { equals: currentUser.id } },
                        {
                            or: [
                                { status: { equals: 'pending' } },
                                { status: { equals: 'confirmed' } },
                                { status: { equals: 'in_progress' } },
                                { status: { equals: 'awaiting_release' } }
                            ]
                        }
                    ]
                },
                depth: 0,
            });
            hasActiveBooking = activeBookings.totalDocs > 0;
        }

        if (currentUser.accountType === 'parent') {
            const { docs: childDocs } = await payload.find({
                collection: 'users',
                where: {
                    and: [
                        { parent: { equals: currentUser.id } },
                        { accountType: { equals: 'student' } }
                    ]
                },
                depth: 0,
                limit: 100,
            });
            parentChildren = childDocs.map((c: any) => ({
                id: c.id,
                name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Student',
            }));
        }
    }

    let rebookInitial:
        | { subjects: string[]; daysOfWeek: string[]; hoursPerDay: number }
        | null = null;
    if (rebook && currentUser) {
        try {
            const priorBooking = (await payload.findByID({
                collection: 'bookings',
                id: rebook,
                depth: 2,
            })) as any;
            if (priorBooking) {
                const studentId = priorBooking.student?.id ?? priorBooking.student;
                const parentId = priorBooking.parent?.id ?? priorBooking.parent;
                const isBooker =
                    String(studentId) === String(currentUser.id) ||
                    String(parentId) === String(currentUser.id);
                if (isBooker) {
                    rebookInitial = {
                        subjects: (priorBooking.subjects || [])
                            .map((s: any) => (typeof s === 'object' ? s?.name : s))
                            .filter(Boolean),
                        daysOfWeek: priorBooking.daysOfWeek || [],
                        hoursPerDay: priorBooking.hoursPerDay || 1,
                    };
                }
            }
        } catch {
            rebookInitial = null;
        }
    }

    const { docs: similarDocs } = await payload.find({
        collection: 'tutor-profiles',
        where: {
            and: [
                { id: { not_equals: tutorProfile.id } },
                { isApproved: { equals: true } },
                {
                    subjects: {
                        in: tutorProfile.subjects?.map((s: any) => s?.id || s) || []
                    }
                }
            ]
        },
        limit: 10,
        depth: 2
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const user = tutorProfile.user;
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonymous Tutor';

    const rating = tutorProfile.rating || 0;
    const totalReviews = tutorProfile.totalReviews || 0;
    const pricePerHour = tutorProfile.hourlyRate || 0;

    const avatarUrl = user?.avatar?.url || "/user-placeholder.png";
    const coverImageUrl = "https://d1csarkz8obe9u.cloudfront.net/posterpreviews/preschool-tutor-service-banner-design-template-00d3fc803b78ce48f1034ff3b7382dab_screen.jpg?ts=1698451931";

    const isVerified = tutorProfile.isVerified || false;
    const responseTimeText = "2 hours";

    const description = tutorProfile.bio ? (
        <div className="flex flex-col gap-4">
            {tutorProfile.bio.split('\n').map((paragraph: string, i: number) => (
                paragraph.trim() ? <p key={i} className="whitespace-pre-wrap">{paragraph}</p> : null
            ))}
        </div>
    ) : (
        <>
            <p>
                No bio provided yet. I specialize in bridging the gap between complex academic theories and practical understanding.
            </p>
        </>
    );

    const subjects = tutorProfile.subjects?.length > 0 ? tutorProfile.subjects.map((subj: any, index: number) => {
        const colors = [
            'bg-tutor-purple-100 text-tutor-purple-800',
            'bg-green-100 text-green-800',
            'bg-muted text-foreground',
            'bg-tutor-red-100 text-tutor-red-600'
        ];
        return {
            name: subj.name,
            icon: <HiBeaker className="w-5 h-5" />,
            colorClass: colors[index % colors.length]
        };
    }) : [];

    const similarTutors = similarDocs.map((doc: any) => {
        const simUser = doc.user;
        const simFullName = `${simUser?.firstName || ''} ${simUser?.lastName || ''}`.trim() || 'Anonymous Tutor';

        return {
            id: doc.slug,
            name: simFullName,
            title: doc.headline || 'Professional Tutor',
            rating: doc.rating || 0,
            priceText: `${formatCurrency(doc.hourlyRate || 0)}/hr`,
            imageUrl: simUser?.avatar?.url || `/user-placeholder.png`
        };
    });

    const { docs: reviewDocs } = await payload.find({
        collection: 'reviews',
        where: {
            and: [{ tutor: { equals: tutorProfile.id } }, { isApproved: { equals: true } }],
        },
        depth: 2,
        limit: 100,
        sort: '-createdAt'
    });

    const reviews = reviewDocs.map((doc: any) => ({
        id: doc.id,
        rating: doc.rating,
        review: doc.review,
        createdAt: doc.createdAt,
        tutorResponse: doc.tutorResponse,
        user: {
            firstName: doc.user?.firstName,
            lastName: doc.user?.lastName,
            avatarUrl: doc.user?.avatar?.url || null
        }
    }));

    const subjectNames = (tutorProfile.subjects ?? []).map((s: any) => s.name ?? s).filter(Boolean);

    const personSchema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: fullName,
        jobTitle: tutorProfile.headline || 'Tutor',
        description: tutorProfile.bio || undefined,
        image: user?.avatar?.url || undefined,
        url: `https://www.tutorcourt.com/tutors/${decodedSlug}`,
        knowsAbout: subjectNames,
        worksFor: {
            '@type': 'Organization',
            name: 'TutorCourt',
            url: 'https://www.tutorcourt.com',
        },
    };

    const serviceSchema = {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: `${fullName} — Tutoring on TutorCourt`,
        provider: {
            '@type': 'Person',
            name: fullName,
        },
        serviceType: 'Tutoring',
        areaServed: { '@type': 'Country', name: 'Nigeria' },
        offers: pricePerHour > 0 ? {
            '@type': 'Offer',
            price: pricePerHour,
            priceCurrency: 'NGN',
            priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: pricePerHour,
                priceCurrency: 'NGN',
                unitText: 'HOUR',
            },
        } : undefined,
        aggregateRating: totalReviews > 0 ? {
            '@type': 'AggregateRating',
            ratingValue: rating,
            reviewCount: totalReviews,
            bestRating: 5,
            worstRating: 1,
        } : undefined,
    };

    return (
        <div className="w-full bg-background min-h-screen pb-24">
            <JsonLd data={[personSchema, serviceSchema]} />
            <TutorHero
                name={fullName}
                title={tutorProfile.headline || 'Professional Tutor'}
                rating={rating}
                reviews={totalReviews}
                pricePerHour={pricePerHour}
                imageUrl={avatarUrl}
                coverImageUrl={coverImageUrl}
                isVerified={isVerified}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12 pt-20">
                <div className="lg:col-span-2 flex flex-col gap-12">
                    <TutorAbout
                        description={description}
                        subjects={subjects}
                        videoUrl={''}
                    />

                    <TutorReviews
                        reviews={reviews}
                        overallRating={rating}
                        totalReviews={totalReviews}
                    />
                </div>

                <div className="lg:col-span-1">
                    <TutorBookingSidebar
                        tutorId={tutorProfile.id}
                        tutorName={fullName}
                        headline={tutorProfile.headline || 'Professional Tutor'}
                        avatarUrl={avatarUrl}
                        pricePerHour={pricePerHour}
                        responseTimeText={responseTimeText}
                        isVerified={Boolean(tutorProfile.isVerified)}
                        offeredSubjects={tutorProfile.subjects?.map((s: any) => s.name) || []}
                        availability={tutorProfile.weeklyAvailability || []}
                        gradesTaught={tutorProfile.gradesTaught || []}
                        hasActiveBooking={hasActiveBooking}
                        currentUserRole={currentUser?.accountType}
                        childrenOptions={parentChildren}
                        initialSubjects={rebookInitial?.subjects}
                        initialDaysOfWeek={rebookInitial?.daysOfWeek}
                        initialHoursPerDay={rebookInitial?.hoursPerDay}
                        autoOpen={Boolean(rebookInitial)}
                    />
                </div>
            </div>

            {similarTutors.length > 0 && (
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                    <SimilarTutors tutors={similarTutors} />
                </div>
            )}
        </div>
    );
}

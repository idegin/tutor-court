import React from 'react';
import { TutorHero } from '@/components/tutors/tutor-hero';
import { TutorAbout } from '@/components/tutors/tutor-about';
import { TutorBookingSidebar } from '@/components/tutors/tutor-booking-sidebar';
import { SimilarTutors } from '@/components/tutors/similar-tutors';
import { HiBeaker, HiCalculator, HiBolt, HiChartBar } from 'react-icons/hi2';
import { getPayload } from 'payload';
import configPromise from '@payload-config';
import { notFound } from 'next/navigation';
import { getServerSideUser } from '@/lib/auth';
import { TutorReviews } from '@/components/tutors/tutor-reviews';

export default async function TutorDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const payload = await getPayload({ config: configPromise });
    const { user: currentUser } = await getServerSideUser();

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(decodedSlug);

    const { docs } = await payload.find({
        collection: 'tutor-profiles',
        where: isObjectId ? { id: { equals: decodedSlug } } : { slug: { equals: decodedSlug } },
        depth: 2
    });

    console.log(`[TutorDetails] Requested slug: ${decodedSlug} | isObjectId: ${isObjectId} | Docs found: ${docs.length}`);

    const tutorProfile = docs[0] as any;

    if (!tutorProfile) {
        return notFound();
    }

    let hasActiveBooking = false;
    let parentChildren: { id: string; name: string }[] = [];
    if (currentUser) {
        const activeBookings = await payload.find({
            collection: 'bookings',
            where: {
                and: [
                    { tutor: { equals: tutorProfile.id } },
                    {
                        or: [
                            { student: { equals: currentUser.id } },
                            { parent: { equals: currentUser.id } }
                        ]
                    },
                    {
                        or: [
                            { status: { equals: 'pending' } },
                            { status: { equals: 'confirmed' } }
                        ]
                    }
                ]
            },
            depth: 0,
        });
        hasActiveBooking = activeBookings.totalDocs > 0;

        // A parent booking on behalf of a child must pick which child.
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

    const { docs: similarDocs } = await payload.find({
        collection: 'tutor-profiles',
        where: {
            and: [
                { id: { not_equals: tutorProfile.id } },
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

    // Formatting currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Prepare data
    const user = tutorProfile.user;
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonymous Tutor';

    // Fallback Mock Data for missing properties
    const rating = tutorProfile.rating || 0;
    const totalReviews = tutorProfile.totalReviews || 0;
    const pricePerHour = tutorProfile.hourlyRate || 0;

    const avatarUrl = user?.avatar?.url || "/user-placeholder.png";
    // We don't have cover image in schema currently, so static fallback
    const coverImageUrl = "https://d1csarkz8obe9u.cloudfront.net/posterpreviews/preschool-tutor-service-banner-design-template-00d3fc803b78ce48f1034ff3b7382dab_screen.jpg?ts=1698451931";

    const isVerified = tutorProfile.isApproved || false;
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
            icon: <HiBeaker className="w-5 h-5" />, // Standard icon, could be dynamic 
            colorClass: colors[index % colors.length]
        };
    }) : [];

    const similarTutors = similarDocs.map((doc: any) => {
        const simUser = doc.user;
        const simFullName = `${simUser?.firstName || ''} ${simUser?.lastName || ''}`.trim() || 'Anonymous Tutor';

        return {
            id: doc.slug, // Use slug for id so the link works correctly
            name: simFullName,
            title: doc.headline || 'Professional Tutor',
            rating: doc.rating || 0,
            priceText: `${formatCurrency(doc.hourlyRate || 0)}/hr`,
            imageUrl: simUser?.avatar?.url || `/user-placeholder.png`
        };
    });

    // Fetch Tutor Reviews
    const { docs: reviewDocs } = await payload.find({
        collection: 'reviews',
        where: { tutor: { equals: tutorProfile.id } },
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

    return (
        <div className="w-full bg-background min-h-screen pb-24">
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
                        videoUrl={''} // No video string in schema yet
                    />

                    <TutorReviews
                        reviews={reviews}
                        overallRating={rating}
                        totalReviews={reviews.length}
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
                        offeredSubjects={tutorProfile.subjects?.map((s: any) => s.name) || []}
                        hasActiveBooking={hasActiveBooking}
                        currentUserRole={currentUser?.accountType}
                        children={parentChildren}
                    />
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                <SimilarTutors tutors={similarTutors} />
            </div>
        </div>
    );
}

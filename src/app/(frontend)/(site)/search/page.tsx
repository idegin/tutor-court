import React from 'react'
import { SearchClient } from '@/components/search/search-client'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Metadata } from 'next'

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
    const params = await searchParams;
    const payload = await getPayload({ config: configPromise });

    const mode = params['mode'] ? String(params['mode']).charAt(0).toUpperCase() + String(params['mode']).slice(1) : '';
    const typeMap: any = { 'one-on-one': 'One-on-one', 'group': 'Group' };
    const typeParam = typeof params['type'] === 'string' ? params['type'] : undefined;
    const type = typeParam ? typeMap[typeParam] || typeParam : '';

    let subjectNames: string[] = [];
    const subjects = params['subject']
        ? (Array.isArray(params['subject']) ? params['subject'] : [params['subject']])
        : [];

    if (subjects.length > 0) {
        const { docs } = await payload.find({
            collection: 'subjects',
            where: { id: { in: subjects as string[] } },
            depth: 0,
        });
        subjectNames = docs.map((d: any) => d.name);
    }

    const ratingList = Array.isArray(params['rating']) ? params['rating'] : params['rating'] ? [params['rating']] : [];
    const ratingParam = ratingList.length > 0 ? Math.min(...ratingList.map(Number)) : undefined;

    const parts = [];
    if (mode) parts.push(mode);
    if (type) parts.push(type);
    if (subjectNames.length > 0) parts.push(subjectNames.join(', '));

    let titleStr = parts.length > 0 ? `${parts.join(' ')} Tutors` : 'Find Expert Tutors';
    if (ratingParam) {
        titleStr += ` with ${ratingParam}+ rating`;
    }

    titleStr += ' | TutorCourt Search';

    return {
        title: titleStr,
        description: `Search and filter through our verified expert tutors. ${titleStr}`,
        openGraph: {
            title: titleStr,
            description: `Search and filter through our verified expert tutors. ${titleStr}`,
            type: 'website',
        }
    }
}


export default async function SearchPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const payload = await getPayload({ config: configPromise });

    // Helper to extract first string value
    const getParam = (k: string) => {
        const val = searchParams[k];
        return typeof val === 'string' ? val : Array.isArray(val) ? val[0] : undefined;
    };

    // Parse params
    // Only constrain by price when the user has explicitly set a bound. The slider's
    // ceiling (50,000) is treated as "no upper bound", so it never sets `maxPrice`.
    const minPriceRaw = getParam('minPrice');
    const maxPriceRaw = getParam('maxPrice');
    const hasMinPrice = minPriceRaw !== undefined && minPriceRaw !== '';
    const hasMaxPrice = maxPriceRaw !== undefined && maxPriceRaw !== '';
    const minPrice = Number(minPriceRaw) || 0;
    const maxPrice = Number(maxPriceRaw) || 0;
    const q = getParam('q')?.trim();
    const ratingList = Array.isArray(searchParams['rating']) ? searchParams['rating'] : searchParams['rating'] ? [searchParams['rating']] : [];
    const ratingParam = ratingList.length > 0 ? Math.min(...ratingList.map(Number)) : undefined;

    const subjects = searchParams['subject']
        ? (Array.isArray(searchParams['subject']) ? searchParams['subject'] : [searchParams['subject']])
        : [];

    // If subjects are passed, they come from the frontend as IDs (e.g. subject=69c847...)
    const subjectIds: string[] = subjects as string[];

    const where: any = {
        and: [
            { isApproved: { equals: true } },
            // Removed usagePlan filter temporarily since seeded test data does not include usagePlan.
        ]
    };

    // Only bound by price when explicitly requested, so tutors with a null hourlyRate
    // (and those above the slider ceiling) are not silently excluded.
    if (hasMinPrice) {
        where.and.push({ hourlyRate: { greater_than_equal: minPrice } });
    }
    if (hasMaxPrice) {
        where.and.push({ hourlyRate: { less_than_equal: maxPrice } });
    }

    // Free-text keyword search across headline/bio and the related user's name.
    if (q) {
        const { docs: userDocs } = await payload.find({
            collection: 'users',
            where: {
                and: [
                    { accountType: { equals: 'tutor' } },
                    { or: [
                        { firstName: { like: q } },
                        { lastName: { like: q } },
                    ] },
                ],
            },
            limit: 200,
            depth: 0,
        });
        const userIds = userDocs.map((u: any) => u.id);

        const orClause: any[] = [
            { headline: { like: q } },
            { bio: { like: q } },
        ];
        if (userIds.length > 0) {
            orClause.push({ user: { in: userIds } });
        }
        where.and.push({ or: orClause });
    }

    if (ratingParam) {
        where.and.push({ rating: { greater_than_equal: ratingParam } });
    }

    if (subjectIds.length > 0) {
        where.and.push({ subjects: { in: subjectIds } });
    }

    // mode
    const mode = searchParams['mode'];
    if (mode && typeof mode === 'string') {
        where.and.push({ mode: { equals: mode } });
    }

    const type = searchParams['type'];
    if (type && typeof type === 'string') {
        where.and.push({ type: { in: [type] } });
    }

    // Experience
    const experience = Number(getParam('experience'));
    if (experience) {
        where.and.push({ yearsOfExperience: { greater_than_equal: experience } });
    }

    const sort = getParam('sort') || '-rating';

    // Fetch all approved tutors
    const { docs: tutorDocs, totalDocs, hasNextPage } = await payload.find({
        collection: 'tutor-profiles',
        where,
        limit: 10,
        sort,
        depth: 2
    });

    const tutors = tutorDocs.map((doc: any) => {
        const user = doc.user;
        const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonymous Tutor';

        return {
            id: doc.id,
            slug: doc.slug,
            name: fullName,
            pricePerHour: doc.hourlyRate || 0,
            rating: doc.rating || 0,
            reviewCount: doc.totalReviews || 0,
            description: doc.bio ? (doc.bio.length > 150 ? doc.bio.substring(0, 150) + '...' : doc.bio) : 'Professional Tutor',
            tags: doc.subjects?.map((s: any) => s.name?.toUpperCase()) || [],
            imageUrl: user?.avatar?.url || '/user-placeholder.png',
            isVerified: doc.isApproved || false,
            mode: doc.mode,
            type: doc.type,
        };
    });

    // The current URL parameters needed to initialize SearchClient
    const initialSearchParams = await searchParams;

    return (
        <div className="min-h-screen bg-background pt-8 pb-24 relative">
            {/* Decorative background shape from image */}
            <div className="absolute top-0 left-0 w-[40%] h-full bg-tutor-purple-50 dark:bg-tutor-purple-950/20 z-0 rounded-br-[10rem] pointer-events-none" />

            <SearchClient
                initialTutors={tutors}
                totalDocs={totalDocs}
                initialHasNextPage={hasNextPage}
                searchParams={initialSearchParams}
            />
        </div>
    )
}

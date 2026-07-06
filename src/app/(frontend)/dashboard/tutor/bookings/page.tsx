import React from 'react';
import { headers as getHeaders } from 'next/headers';
import { getPayload } from 'payload';
import config from '@payload-config';
import { TutorBookingsTable } from '@/components/bookings/tutor-bookings-table';

export const metadata = {
    title: "Bookings | Tutor Court",
    description: "Manage your class bookings and schedule.",
};

export default async function TutorBookingsPage() {
    const payload = await getPayload({ config });
    const headers = await getHeaders();
    const { user } = await payload.auth({ headers });

    if (!user) return null;

    // Resolve the tutor's profile — bookings are attributed to the tutor-profiles id.
    const { docs: profileDocs } = await payload.find({
        collection: 'tutor-profiles',
        where: { user: { equals: user.id } },
        depth: 0,
        limit: 1,
    });
    const tutorProfileId = profileDocs[0]?.id;

    let bookings: any[] = [];
    if (tutorProfileId) {
        const res = await payload.find({
            collection: 'bookings',
            where: { tutor: { equals: tutorProfileId } },
            depth: 2,
            sort: '-createdAt',
            limit: 100,
        });
        bookings = JSON.parse(JSON.stringify(res.docs));
    }

    return (
        <div className="flex h-full min-h-[80vh] w-full flex-col p-4 md:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
            <TutorBookingsTable bookings={bookings} />
        </div>
    );
}

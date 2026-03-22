import React from 'react';
import { TutorBookingsTable } from '@/components/bookings/tutor-bookings-table';

export const metadata = {
    title: "Bookings | Tutor Court",
    description: "Manage your class bookings and schedule.",
};

export default function TutorBookingsPage() {
    return (
        <div className="flex h-full min-h-[80vh] w-full flex-col bg-background p-4 md:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
            <TutorBookingsTable />
        </div>
    );
}

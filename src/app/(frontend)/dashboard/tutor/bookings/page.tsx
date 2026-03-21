import React from 'react';
import { HiOutlineWrenchScrewdriver } from 'react-icons/hi2';

export default function TutorBookingsPage() {
    return (
        <div className="flex h-full min-h-[80vh] w-full flex-col items-center justify-center p-8 bg-background">
            <div className="flex flex-col items-center justify-center p-12 max-w-sm w-full border border-border/60 rounded-xl bg-card">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center border border-border/80 mb-6">
                    <HiOutlineWrenchScrewdriver className="w-8 h-8 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3 text-center tracking-tight">
                    Bookings (Coming Soon)
                </h1>
                <p className="text-sm text-muted-foreground text-center font-medium">
                    This feature is currently under development. Please check back later.
                </p>
                <div className="mt-8 px-4 py-1.5 bg-primary/10 text-primary font-semibold text-xs uppercase tracking-wider rounded-md border border-primary/20">
                    Coming Soon
                </div>
            </div>
        </div>
    );
}

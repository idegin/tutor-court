'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

export default function TutorDashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => { console.error(error) }, [error]);

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
            <div className="w-full max-w-md rounded-2xl border-[3px] border-foreground bg-card p-8 flex flex-col items-center text-center gap-5">
                <div className="w-14 h-14 rounded-full bg-tutor-red-100 border-[3px] border-foreground flex items-center justify-center">
                    <HiOutlineExclamationTriangle className="w-7 h-7 text-tutor-red-500" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-foreground mb-2">Something went wrong</h2>
                    <p className="text-sm text-muted-foreground font-semibold">
                        {error.message || 'An unexpected error occurred in this section.'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Button
                        onClick={reset}
                        className="flex-1 h-10 font-black border-[2px] border-foreground shadow-none"
                    >
                        Try Again
                    </Button>
                    <Link href="/dashboard/tutor" className="flex-1">
                        <Button
                            variant="outline"
                            className="w-full h-10 font-black border-[2px] border-foreground shadow-none"
                        >
                            Tutor Overview
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

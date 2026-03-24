'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HiExclamationTriangle } from 'react-icons/hi2';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-16 bg-background text-center">
            <div className="w-24 h-24 bg-tutor-red-100 rounded-full flex items-center justify-center border-[3px] border-foreground mb-8">
                <HiExclamationTriangle className="w-12 h-12 text-tutor-red-500" />
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4 tracking-tight">
                Something went wrong
            </h1>

            <p className="text-lg font-bold text-muted-foreground max-w-md mb-10">
                We're sorry, but an unexpected error occurred. Don't worry, our team has been notified and is looking into it.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto max-w-xs sm:max-w-none">
                <Button
                    onClick={() => reset()}
                    size="lg"
                    className="w-full sm:w-auto h-14 px-8 text-lg font-black bg-foreground text-background border-[3px] border-foreground rounded-xl hover:bg-foreground/90 transition-all"
                >
                    Try Again
                </Button>

                <Link href="/" className="block w-full sm:w-auto">
                    <Button
                        size="lg"
                        className="w-full h-14 px-8 text-lg font-black bg-background text-foreground border-[3px] border-foreground rounded-xl hover:bg-muted transition-all"
                    >
                        Return Home
                    </Button>
                </Link>
            </div>
        </div>
    );
}
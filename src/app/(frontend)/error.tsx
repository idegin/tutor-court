'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-16 bg-background text-center relative overflow-hidden">
            <div className="absolute top-[10%] right-[5%] w-48 h-48 bg-tutor-red-100/60 rounded-full pointer-events-none" />
            <div className="absolute bottom-[10%] left-[5%] w-32 h-32 bg-primary/10 rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-8 select-none" aria-hidden="true">
                    <span className="text-[120px] md:text-[160px] font-black leading-none text-foreground/5 absolute top-1 left-1">ERR</span>
                    <span className="text-[120px] md:text-[160px] font-black leading-none text-tutor-red-500/20 absolute top-0.5 left-0.5">ERR</span>
                    <span className="text-[120px] md:text-[160px] font-black leading-none text-foreground relative z-10">ERR</span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-tutor-red-100 dark:bg-tutor-red-900/30 px-4 py-2 mb-6">
                    <span className="w-2 h-2 rounded-full bg-tutor-red-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest text-tutor-red-700 dark:text-tutor-red-300">
                        Server Error
                    </span>
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
                    Something went wrong
                </h1>

                <p className="text-base md:text-lg font-semibold text-muted-foreground max-w-md mb-3">
                    An unexpected error occurred. Our team has been notified and is looking into it.
                </p>

                {error.digest && (
                    <p className="text-xs text-muted-foreground/60 font-mono mb-8">
                        Error ID: {error.digest}
                    </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button
                        onClick={() => reset()}
                        size="lg"
                        className="h-12 px-8 font-black bg-foreground text-background border-[3px] border-foreground rounded-xl hover:bg-foreground/90 transition-all"
                    >
                        Try Again
                    </Button>
                    <Link href="/">
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-12 px-8 font-black border-[3px] border-foreground rounded-xl hover:bg-muted transition-all"
                        >
                            Go Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

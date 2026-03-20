import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function ClassesLoadingSkeleton() {
    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-full sm:w-64" />
                    <Skeleton className="h-10 w-32 shrink-0" />
                </div>
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="shadow-none border-border overflow-hidden flex flex-col h-[380px]">
                        <Skeleton className="h-40 w-full rounded-none" />
                        
                        <div className="p-4 space-y-4">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-7 w-3/4" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                            </div>
                        </div>
                        
                        <div className="p-4 mt-auto border-t border-border/50 flex gap-4">
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

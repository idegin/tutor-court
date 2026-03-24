import React from 'react';

export default function Loading() {
    return (
        <div className="animate-pulse w-full">
            {/* Hero skeleton */}
            <div className="w-full h-[300px] bg-muted rounded-b-[2rem]"></div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-[-80px] relative z-10 mb-16">
                <div className="bg-card rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center md:items-end gap-6 border-[3px] border-muted">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-muted shrink-0 border-[3px] border-muted" />
                    <div className="flex-grow w-full space-y-4">
                        <div className="h-4 bg-muted rounded w-1/4"></div>
                        <div className="h-8 bg-muted rounded w-1/2"></div>
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-12 pb-24">
                <div className="lg:col-span-2 space-y-12">
                    {/* About skeleton */}
                    <div className="space-y-4">
                        <div className="h-8 bg-muted rounded w-1/4"></div>
                        <div className="h-4 bg-muted rounded w-full"></div>
                        <div className="h-4 bg-muted rounded w-full"></div>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                    </div>
                    {/* Subjects skeleton */}
                    <div className="space-y-4">
                        <div className="h-8 bg-muted rounded w-1/4"></div>
                        <div className="flex gap-4">
                            <div className="h-12 bg-muted rounded-xl w-32"></div>
                            <div className="h-12 bg-muted rounded-xl w-40"></div>
                            <div className="h-12 bg-muted rounded-xl w-36"></div>
                        </div>
                    </div>
                </div>
                <div>
                    {/* Sidebar skeleton */}
                    <div className="h-[400px] bg-muted rounded-[2rem] border-[3px] border-muted w-full"></div>
                </div>
            </div>
        </div>
    );
}

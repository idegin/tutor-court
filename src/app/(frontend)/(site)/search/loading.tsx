import React from 'react'

export default function SearchLoading() {
    return (
        <div className="min-h-screen bg-background pt-8 pb-24 relative overflow-hidden animate-pulse">
            {/* Decorative background shape */}
            <div className="absolute top-0 left-0 w-[40%] h-full bg-tutor-purple-50 dark:bg-tutor-purple-950/20 -z-0 rounded-br-[10rem] pointer-events-none" />

            <div className="container mx-auto px-4 max-w-7xl relative z-10 flex flex-col md:flex-row gap-8">
                {/* Left Sidebar Skeleton */}
                <div className="bg-card w-full md:w-80 rounded-[2rem] border-[3px] border-muted p-6 md:p-8 flex-shrink-0 h-[800px]">
                    <div className="h-8 w-32 bg-muted rounded mb-2" />
                    <div className="h-4 w-40 bg-muted rounded mb-8" />

                    <div className="space-y-10">
                        <div className="space-y-4">
                            <div className="h-4 w-24 bg-muted rounded" />
                            <div className="h-6 w-32 bg-muted rounded" />
                            <div className="h-6 w-28 bg-muted rounded" />
                            <div className="h-6 w-24 bg-muted rounded" />
                        </div>
                    </div>
                </div>

                {/* Main Content Skeleton */}
                <div className="flex-1 flex flex-col">
                    {/* Header Skeleton */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                        <div>
                            <div className="h-12 w-64 bg-muted rounded mb-2" />
                            <div className="h-6 w-96 bg-muted rounded" />
                        </div>

                        <div className="h-14 w-28 bg-muted rounded-2xl" />
                    </div>

                    {/* List Skeleton */}
                    <div className="flex flex-col gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex flex-col md:flex-row bg-card rounded-[2rem] border-[3px] border-muted overflow-hidden p-6 md:p-8 gap-6 md:gap-8">
                                <div className="w-full md:w-64 h-64 md:h-auto rounded-[1.5rem] bg-muted flex-shrink-0" />
                                <div className="flex flex-col flex-grow">
                                    <div className="flex justify-between mb-4">
                                        <div>
                                            <div className="h-8 w-48 bg-muted rounded mb-2" />
                                            <div className="h-4 w-32 bg-muted rounded" />
                                        </div>
                                        <div className="h-8 w-24 bg-muted rounded" />
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        <div className="h-4 w-full bg-muted rounded" />
                                        <div className="h-4 w-full bg-muted rounded" />
                                        <div className="h-4 w-2/3 bg-muted rounded" />
                                    </div>
                                    <div className="flex gap-2 mb-8">
                                        <div className="h-8 w-24 bg-muted rounded-full" />
                                        <div className="h-8 w-28 bg-muted rounded-full" />
                                    </div>
                                    <div className="flex gap-4 mt-auto">
                                        <div className="h-14 flex-1 bg-muted rounded-xl" />
                                        <div className="h-14 flex-1 bg-muted rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

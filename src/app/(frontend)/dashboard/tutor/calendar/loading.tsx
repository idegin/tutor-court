import React from 'react'

export default function Loading() {
    return (
        <div className="flex h-[calc(100vh-64px)] w-full flex-col animate-pulse">
            <div className="flex flex-col gap-1 p-6 md:px-8 md:pt-6 md:pb-4 border-b border-border/50">
                <div className="h-8 w-48 bg-muted rounded-md mb-2"></div>
                <div className="h-4 w-72 bg-muted rounded-md"></div>
            </div>

            <div className="flex-1 overflow-hidden p-6 md:p-8">
                <div className="bg-background border border-border/80 rounded-xl p-4 h-full flex flex-col gap-4">
                    <div className="flex justify-between items-center px-2">
                        <div className="h-8 w-32 bg-muted rounded-md shrink-0"></div>
                        <div className="h-6 w-48 bg-muted rounded-md shrink-0"></div>
                        <div className="h-8 w-16 bg-muted rounded-md shrink-0"></div>
                    </div>
                    <div className="flex-1 w-full bg-muted/50 rounded-lg"></div>
                </div>
            </div>
        </div>
    )
}

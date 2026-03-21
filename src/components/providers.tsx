'use client';
import React from 'react';
import { Next13ProgressBar } from 'next13-progressbar';

type Props = {
    children: React.ReactNode
}

export default function Providers({ children }: Props) {
    return (
        <>
            <Next13ProgressBar
                color="#BBE381"
                // options={{ showSpinner: false }}
                height={4}
            />
            {children}
        </>
    )
}
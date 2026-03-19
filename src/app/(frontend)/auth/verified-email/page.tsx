'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { AuthLayout, VerifiedEmailCard } from '@/components/auth'

export default function VerifiedEmailPage() {
    const router = useRouter()

    return (
        <AuthLayout
            imageUrl="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2073&auto=format&fit=crop"
            panelTitle="Welcome to the community"
            panelDescription="Connect with learners and educators from around the globe."
            panelContent={
                <div className="relative z-20 -mt-16 bg-white/95 backdrop-blur pb-4 px-8 pt-4 rounded-3xl w-[90%] max-w-[380px] shadow-xl flex items-center justify-start gap-5 border border-white">
                    <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-[#ffd3b6]" />
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-[#ffaaa5]" />
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-zinc-800" />
                    </div>
                    <div className="h-10 w-px bg-border/80" />
                    <p className="font-semibold text-[15px] text-[#1A1F26]">Join 5,000+ active learners</p>
                </div>
            }
        >
            <VerifiedEmailCard onContinueClick={() => router.push('/')} />
        </AuthLayout>
    )
}

'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { AuthLayout, VerifiedEmailCard } from '@/components/auth'

export default function VerifiedEmailPage() {
    const router = useRouter()

    return (
        <AuthLayout
            variant="card"
            imagePosition="right"
            imageUrl="https://images.unsplash.com/photo-1523240795612-9a054b0fc644?q=80&w=2070&auto=format&fit=crop"
            panelContent={
                <div className="bg-white/90 backdrop-blur pb-4 px-8 pt-4 rounded-3xl w-[90%] shadow-xl flex items-center justify-start gap-6 border border-white">
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

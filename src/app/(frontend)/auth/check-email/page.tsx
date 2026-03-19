'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { AuthLayout, CheckEmailCard } from '@/components/auth'
import { toast } from 'sonner'

function CheckEmailContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get('email')

    const handleResend = async () => {
        if (!email) {
            toast.error('No email provided to resend to. Please try logging in or signing up again.')
            return
        }
        try {
            const res = await fetch('/api/users/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                toast.success('Verification email sent!')
            } else {
                toast.error(data.error || 'Failed to resend email.')
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again.')
        }
    }

    return (
        <CheckEmailCard 
            onContinueClick={() => router.push('/auth/login')} 
            onResendClick={handleResend}
        />
    )
}

export default function CheckEmailPage() {
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
            <React.Suspense fallback={<CheckEmailCard onContinueClick={() => {}} />}>
                <CheckEmailContent />
            </React.Suspense>
        </AuthLayout>
    )
}

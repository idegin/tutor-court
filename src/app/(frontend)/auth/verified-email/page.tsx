'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { AuthLayout, VerifiedEmailCard } from '@/components/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

function VerifiedEmailContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = React.useState('')

    React.useEffect(() => {
        if (!token) {
            setStatus('error')
            setErrorMessage('No verification token provided. The link may be broken or malformed.')
            return
        }

        async function verifyEmail() {
            setStatus('loading')
            try {
                const response = await fetch(`/api/users/verify/${token}`, {
                    method: 'POST',
                })

                if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.errors?.[0]?.message || 'Failed to verify email. The token may be expired or invalid.')
                }

                setStatus('success')
            } catch (err: any) {
                setStatus('error')
                setErrorMessage(err.message)
            }
        }

        verifyEmail()
    }, [token])

    if (status === 'idle' || status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 py-12">
                <Spinner size="lg" className="text-tutor-purple-600" />
                <h2 className="text-xl font-semibold tracking-tight">Verifying your email...</h2>
                <p className="text-muted-foreground text-center max-w-sm">Please wait a moment while we confirm your email address.</p>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <Card className="border-tutor-red-200 bg-tutor-red-50 dark:bg-tutor-red-900/10 dark:border-tutor-red-900/50 shadow-sm">
                <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                    <div className="inline-flex size-12 items-center justify-center rounded-full bg-tutor-red-100 dark:bg-tutor-red-900/50 text-tutor-red-600 dark:text-tutor-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-tutor-red-700 dark:text-tutor-red-400">Verification Failed</h2>
                    <p className="text-tutor-red-600/80 dark:text-tutor-red-400/80 max-w-sm pb-2">{errorMessage}</p>
                    <Button onClick={() => router.push('/auth/login')} variant="outline" className="border-tutor-red-200 hover:bg-tutor-red-100 dark:border-tutor-red-800 dark:hover:bg-tutor-red-900/50">
                        Back to Login
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return <VerifiedEmailCard onContinueClick={() => router.push('/auth/login')} />
}

export default function VerifiedEmailPage() {
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
            <React.Suspense fallback={
                <div className="flex justify-center p-12"><Spinner size="lg" className="text-tutor-purple-600" /></div>
            }>
                <VerifiedEmailContent />
            </React.Suspense>
        </AuthLayout>
    )
}

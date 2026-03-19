import * as React from 'react'
import { HiEnvelope } from 'react-icons/hi2'
import { FaInfoCircle } from 'react-icons/fa'

import { Button } from '@/components/ui/button'

type CheckEmailCardProps = {
    title?: string
    description?: string
    ctaLabel?: string
    onContinueClick?: () => void
    onResendClick?: () => void
}

export function CheckEmailCard({
    title = 'Check your email',
    description =
    'We\'ve sent a verification link to your email address. Please click the link to verify your account and continue.',
    ctaLabel = 'Back to login',
    onContinueClick,
    onResendClick,
}: CheckEmailCardProps) {
    const [countdown, setCountdown] = React.useState(60)

    React.useEffect(() => {
        if (countdown <= 0) return

        const timerId = setInterval(() => {
            setCountdown((prev) => prev - 1)
        }, 1000)

        return () => clearInterval(timerId)
    }, [countdown])

    const handleResend = (e: React.MouseEvent) => {
        e.preventDefault()
        if (countdown > 0) return
        setCountdown(60)
        onResendClick?.()
    }

    return (
        <div className="space-y-6">
            <div className="inline-flex size-16 items-center justify-center rounded-full bg-tutor-purple-100 dark:bg-tutor-purple-900/50">
                <div className="flex size-12 items-center justify-center rounded-full bg-tutor-purple-600">
                    <HiEnvelope className="h-6 w-6 text-white" />
                </div>
            </div>

            <div className="pt-2 pb-2">
                <h2 className="text-[2.5rem] font-bold tracking-tight text-[#1A1F26] dark:text-foreground leading-tight">{title}</h2>
                <p className="mt-3 max-w-sm text-base leading-relaxed text-muted-foreground">{description}</p>
            </div>

            <Button type="button" size="lg" className="h-12 w-auto px-8 text-[15px] rounded-xl font-bold bg-tutor-purple-600 text-white hover:bg-tutor-purple-700" onClick={onContinueClick}>
                {ctaLabel}
            </Button>

            <p className="pt-4 flex items-center gap-1.5 text-sm text-muted-foreground/80">
                <FaInfoCircle className="h-4 w-4" />
                Didn't receive it?{' '}
                {countdown > 0 ? (
                    <span className="font-medium text-muted-foreground ml-1">
                        Resend in {countdown}s
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={handleResend}
                        className="font-semibold text-tutor-purple-600 hover:underline ml-1"
                    >
                        Resend email
                    </button>
                )}
            </p>
        </div>
    )
}

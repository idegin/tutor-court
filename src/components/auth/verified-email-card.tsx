import * as React from 'react'
import { HiCheck } from 'react-icons/hi2'
import { FaInfoCircle } from 'react-icons/fa'

import { Button } from '@/components/ui/button'

type VerifiedEmailCardProps = {
    title?: string
    description?: string
    ctaLabel?: string
    onContinueClick?: () => void
}

export function VerifiedEmailCard({
    title = 'Email Verified!',
    description =
    'Your email has been successfully verified. You can now access all the features of TutorCourt and start your learning journey.',
    ctaLabel = 'Go to Dashboard',
    onContinueClick,
}: VerifiedEmailCardProps) {
    return (
        <div className="space-y-6">
            <div className="inline-flex size-16 items-center justify-center rounded-full bg-primary/20">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary">
                    <HiCheck className="h-7 w-7 text-primary-foreground stroke-2" />
                </div>
            </div>

            <div className="pt-2 pb-2">
                <h2 className="text-[2.5rem] font-bold tracking-tight text-[#1A1F26] dark:text-foreground leading-tight">{title}</h2>
                <p className="mt-3 max-w-sm text-base leading-relaxed text-muted-foreground">{description}</p>
            </div>

            <Button type="button" size="lg" className="h-12 w-auto px-8 text-[15px] rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90" onClick={onContinueClick}>
                {ctaLabel}
            </Button>

            <p className="pt-4 flex items-center gap-1.5 text-sm text-muted-foreground/80">
                <FaInfoCircle className="h-4 w-4" />
                Need help? Visit our <a href="#" className="font-semibold text-primary hover:underline ml-1">Help Center</a>
            </p>
        </div>
    )
}

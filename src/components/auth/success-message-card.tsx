import * as React from 'react'
import { HiCheck } from 'react-icons/hi2'
import { FaInfoCircle } from 'react-icons/fa'

import { Button } from '@/components/ui/button'

type SuccessMessageCardProps = {
    title: string
    description: string
    ctaLabel?: string
    onContinueClick?: () => void
}

export function SuccessMessageCard({
    title,
    description,
    ctaLabel = 'Continue',
    onContinueClick,
}: SuccessMessageCardProps) {
    return (
        <div className="space-y-6">
            <div className="inline-flex size-16 items-center justify-center rounded-full bg-tutor-purple-100 dark:bg-tutor-purple-900/50">
                <div className="flex size-12 items-center justify-center rounded-full bg-tutor-purple-600">
                    <HiCheck className="h-7 w-7 text-white stroke-2" />
                </div>
            </div>

            <div className="pt-2 pb-2">
                <h2 className="text-[2.5rem] font-bold tracking-tight text-[#1A1F26] dark:text-foreground leading-tight">{title}</h2>
                <p className="mt-3 max-w-sm text-base leading-relaxed text-muted-foreground">{description}</p>
            </div>

            <Button type="button" size="lg" className="h-12 w-auto px-8 text-[15px] rounded-xl font-bold bg-tutor-purple-600 text-white hover:bg-tutor-purple-700" onClick={onContinueClick}>
                {ctaLabel}
            </Button>
        </div>
    )
}

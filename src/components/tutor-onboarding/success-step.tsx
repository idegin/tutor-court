import * as React from 'react'
import { HiCheck } from 'react-icons/hi2'
import { FaInfoCircle } from 'react-icons/fa'
import { Button } from '@/components/ui/button'

type SuccessStepProps = {
    onContinueClick: () => void
}

export function SuccessStep({ onContinueClick }: SuccessStepProps) {
    return (
        <div className="space-y-6">
            <div className="inline-flex size-16 items-center justify-center rounded-full bg-primary/10">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary">
                    <HiCheck className="h-7 w-7 text-primary-foreground stroke-2" />
                </div>
            </div>

            <div className="pt-2 pb-2">
                <h2 className="text-[2.5rem] font-bold tracking-tight text-foreground leading-tight">Profile Submitted!</h2>
                <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                    Your profile has been submitted successfully. We will review and approve your profile within <b>2 business days</b>.
                </p>
                <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                    In the meantime, you can go ahead to your dashboard, create classes, and even host them. Your profile just won't be publicly displayed in the directory until it is approved.
                </p>
            </div>

            <Button type="button" size="lg" className="h-12 w-auto px-8 text-[15px] rounded-xl font-bold" onClick={onContinueClick}>
                Go to Dashboard
            </Button>

            <p className="pt-4 flex items-center gap-1.5 text-sm text-muted-foreground/80">
                <FaInfoCircle className="h-4 w-4" />
                Need help? Visit our <a href="#" className="font-semibold text-primary hover:underline ml-1">Help Center</a>
            </p>
        </div>
    )
}

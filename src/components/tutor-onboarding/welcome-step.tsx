import React from 'react'
import { HiCheck as Check, HiArrowRight as ArrowRight } from 'react-icons/hi2'
import { Button } from '@/components/ui/button'

type WelcomeStepProps = {
    onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
    return (
        <div className="flex flex-col max-w-md w-full mx-auto md:ml-0 md:mr-auto justify-center h-full">
            <div className="flex items-center gap-2 mb-6">
                <span className="inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary border border-secondary/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary mr-1.5 animate-pulse" />
                    New Tutor Onboarding
                </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
                Welcome to<br />TutorCourt!
            </h1>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                We're excited to have you join our community of elite educators. This onboarding process will take about 5 minutes to set up your profile and classroom preferences.
            </p>

            <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-4">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-foreground pt-1.5">Verified elite tutor network</span>
                    </div>
                </li>
                <li className="flex items-start gap-4">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-foreground pt-1.5">Flexible scheduling & easy booking</span>
                    </div>
                </li>
            </ul>

            <Button size="lg" className="w-max px-8 h-12 text-[15px] font-bold rounded-xl shadow-sm" onClick={onNext}>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="mt-6 text-sm text-muted-foreground flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-muted-foreground/30 text-[10px]">i</span>
                You can save your progress and return at any time.
            </p>
        </div>
    )
}

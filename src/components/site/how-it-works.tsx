import React from 'react'
import { HiArrowRight as ArrowRight } from 'react-icons/hi2'
import Link from 'next/link'

const steps = [
    {
        number: '1',
        title: 'Signup',
        description: 'Create your profile as a student or tutor. It takes less than 2 minutes to join our community.',
        linkColor: 'text-primary',
        linkText: 'Join now',
        linkHref: '/auth/register',
        circleBg: 'bg-primary dark:bg-primary',
        circleColor: 'bg-primary',
    },
    {
        number: '2',
        title: 'Search',
        description: 'Browse thousands of verified expert tutors. Filter by subject, level, budget, and more.',
        linkColor: 'text-tutor-red-800 dark:text-tutor-red-500',
        linkText: 'Find tutor',
        linkHref: '/search',
        circleBg: 'bg-tutor-purple-300 dark:bg-tutor-purple-400',
        circleColor: 'bg-tutor-purple-300',
    },
    {
        number: '3',
        title: 'Book',
        description: 'Schedule a free consultation and book your first lesson. Secure payments via our platform.',
        linkColor: 'text-tutor-red-800 dark:text-tutor-red-500',
        linkText: 'Book lesson',
        linkHref: '/search',
        circleBg: 'bg-tutor-red-500 dark:bg-tutor-red-600',
        circleColor: 'bg-tutor-red-500',
    }
]

export function HowItWorks() {
    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-20 relative z-10">
                    <p className="text-sm font-bold tracking-[0.2em] text-primary uppercase mb-4">Process</p>
                    <h2 className="text-4xl md:text-5xl lg:text-5xl font-black text-foreground mb-6">How It Works</h2>
                    <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                        Your journey to academic excellence in three simple steps.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative max-w-6xl mx-auto">
                    {/* Connector line for desktop */}
                    <div className="hidden md:block absolute top-[80px] left-[15%] right-[15%] h-[2px] border-t-[2px] border-dashed border-muted-foreground/30 z-0" />

                    {steps.map((step, index) => (
                        <div
                            key={index}
                            className="flex flex-col items-center p-10 rounded-[2.5rem] border-[3px] border-foreground bg-card text-center relative z-10"
                        >
                            <div
                                className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-foreground border-[3px] border-foreground mb-8 ${step.circleBg}`}
                            >
                                {step.number}
                            </div>

                            <h3 className="text-2xl font-black text-foreground mb-4">{step.title}</h3>

                            <p className="text-muted-foreground mb-10 text-base md:text-[1.05rem] leading-relaxed flex-grow">
                                {step.description}
                            </p>

                            <Link
                                href={step.linkHref}
                                className={`inline-flex items-center text-[1.1rem] font-bold hover:opacity-80 transition-opacity ${step.linkColor}`}
                            >
                                {step.linkText}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

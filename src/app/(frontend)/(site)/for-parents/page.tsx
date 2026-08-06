import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
    HiArrowRight,
    HiShieldCheck,
    HiAcademicCap,
    HiPresentationChartLine,
    HiClock,
    HiUserGroup,
    HiSparkles,
} from 'react-icons/hi2'

export const metadata: Metadata = {
    title: 'For Parents | TutorCourt',
    description:
        'Give your child the edge with vetted, expert tutors. Track progress, pay safely with escrow, and watch grades climb — all from one dashboard.',
}

const benefits = [
    {
        icon: HiShieldCheck,
        title: 'Every tutor is vetted',
        description:
            'Background checks, verified credentials and a live teaching assessment. Only the top applicants ever reach your child.',
        bg: 'bg-primary/20',
        color: 'text-primary',
    },
    {
        icon: HiPresentationChartLine,
        title: 'See real progress',
        description:
            'Session reports, homework and assessment scores land in your dashboard — so you always know exactly how your child is improving.',
        bg: 'bg-tutor-purple-100 dark:bg-tutor-purple-900/50',
        color: 'text-tutor-purple-800 dark:text-tutor-purple-300',
    },
    {
        icon: HiShieldCheck,
        title: 'Your money is protected',
        description:
            'Fund a lesson and we hold it in escrow. The tutor is only paid once the class is delivered and you are happy. No risk, ever.',
        bg: 'bg-tutor-red-100 dark:bg-tutor-red-900/50',
        color: 'text-tutor-red-800 dark:text-tutor-red-300',
    },
    {
        icon: HiClock,
        title: 'Learning that fits your life',
        description:
            'Weekday evenings, weekend mornings, exam-season crunch — book sessions around your family, not the other way around.',
        bg: 'bg-muted',
        color: 'text-foreground',
    },
    {
        icon: HiAcademicCap,
        title: 'Matched to your child',
        description:
            'Tell us the subject, level and how your child learns. We surface tutors who fit — then let you meet them free before you commit.',
        bg: 'bg-primary/20',
        color: 'text-primary',
    },
    {
        icon: HiUserGroup,
        title: 'One dashboard, every child',
        description:
            'Manage tutors, schedules, payments and reports for all of your children in a single, calm place.',
        bg: 'bg-tutor-purple-100 dark:bg-tutor-purple-900/50',
        color: 'text-tutor-purple-800 dark:text-tutor-purple-300',
    },
]

const steps = [
    {
        number: '1',
        title: 'Tell us what your child needs',
        description: 'Pick the subject, level and goals. It takes two minutes and costs nothing.',
        circleBg: 'bg-primary',
    },
    {
        number: '2',
        title: 'Meet your match for free',
        description: 'Browse vetted tutors and book a free intro session to make sure it clicks.',
        circleBg: 'bg-tutor-purple-300',
    },
    {
        number: '3',
        title: 'Book, learn and track',
        description: 'Schedule lessons, pay safely through escrow, and watch the reports roll in.',
        circleBg: 'bg-tutor-red-500',
    },
]

export default function ForParentsPage() {
    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden bg-card pt-24 pb-24">
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute right-[-5%] top-[8%] w-[300px] h-[300px] md:w-[480px] md:h-[480px] bg-tutor-purple-50 rounded-full" />
                    <div className="absolute left-[3%] bottom-[6%] w-[120px] h-[120px] md:w-[200px] md:h-[200px] bg-primary/20 rounded-full" />
                </div>

                <div className="container relative z-10 mx-auto max-w-7xl px-4 md:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-background px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-6">
                                <HiSparkles className="w-4 h-4 text-primary" />
                                For Parents
                            </span>
                            <h1 className="text-4xl md:text-6xl lg:text-[4.25rem] font-black tracking-tight text-foreground leading-[1.05] mb-6">
                                The right tutor can change{' '}
                                <span className="relative inline-block">
                                    <span className="italic text-primary relative z-10">everything</span>
                                    <span className="absolute bottom-1 left-0 w-full h-[10px] bg-tutor-purple-200 z-0 rounded-sm" />
                                </span>
                                .
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl font-medium leading-relaxed">
                                Give your child a vetted expert who teaches the way they learn.
                                Track every lesson, pay safely with escrow, and watch the grades
                                follow.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/search"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-tutor-red-500 px-8 py-4 text-lg font-black text-white hover:bg-tutor-red-600 transition-colors"
                                >
                                    Find a tutor
                                    <HiArrowRight className="w-5 h-5" />
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="inline-flex items-center justify-center rounded-full border-2 border-foreground bg-background px-8 py-4 text-lg font-black text-foreground hover:bg-muted transition-colors"
                                >
                                    Create free account
                                </Link>
                            </div>
                            <p className="mt-4 text-sm font-semibold text-muted-foreground">
                                Free to join · First consultation is on us · No card required
                            </p>
                        </div>

                        <div className="relative h-[420px] md:h-[520px] w-full">
                            <div className="absolute inset-0 rounded-[2.5rem] border-[3px] border-foreground overflow-hidden bg-muted">
                                <img
                                    src="https://images.unsplash.com/photo-1758525860449-fa3602fceb31?auto=format&fit=crop&q=80&w=1000"
                                    alt="Tutor helping a student with schoolwork"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-6 -left-4 md:-left-8 z-20 bg-primary p-5 md:p-6 rounded-[1.75rem] border-[3px] border-foreground w-[220px] md:w-[260px]">
                                <p className="text-3xl md:text-4xl font-black text-primary-foreground leading-none mb-2">
                                    2,000+
                                </p>
                                <p className="text-primary-foreground/90 font-bold text-sm leading-snug">
                                    parents across Nigeria trust TutorCourt
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Reassurance strip */}
            <section className="bg-foreground text-background py-8">
                <div className="container mx-auto max-w-7xl px-4 md:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        {[
                            { stat: '100%', label: 'Vetted tutors' },
                            { stat: 'Free', label: 'First consultation' },
                            { stat: 'Escrow', label: 'Protected payments' },
                            { stat: '98%', label: 'Report grade gains' },
                        ].map((item) => (
                            <div key={item.label}>
                                <p className="text-2xl md:text-4xl font-black text-primary mb-1">{item.stat}</p>
                                <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-background/70">
                                    {item.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="py-24 bg-card">
                <div className="container mx-auto max-w-7xl px-4 md:px-8">
                    <div className="max-w-2xl mb-16">
                        <p className="text-sm font-bold tracking-[0.2em] text-primary uppercase mb-4">
                            Why parents choose us
                        </p>
                        <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight">
                            Everything you worry about, handled.
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {benefits.map((benefit) => (
                            <div
                                key={benefit.title}
                                className="flex flex-col p-8 rounded-[2rem] border-[3px] border-foreground bg-background"
                            >
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 ${benefit.bg}`}>
                                    <benefit.icon className={`w-6 h-6 ${benefit.color}`} />
                                </div>
                                <h3 className="text-xl font-black text-foreground mb-3">{benefit.title}</h3>
                                <p className="text-muted-foreground leading-relaxed text-[1.02rem]">
                                    {benefit.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-24 bg-background">
                <div className="container mx-auto max-w-6xl px-4 md:px-8">
                    <div className="text-center mb-20">
                        <p className="text-sm font-bold tracking-[0.2em] text-primary uppercase mb-4">Simple to start</p>
                        <h2 className="text-4xl md:text-5xl font-black text-foreground">
                            From worried to winning in three steps
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        <div className="hidden md:block absolute top-[50px] left-[15%] right-[15%] h-[2px] border-t-[2px] border-dashed border-muted-foreground/30 z-0" />
                        {steps.map((step) => (
                            <div
                                key={step.number}
                                className="flex flex-col items-center p-10 rounded-[2.5rem] border-[3px] border-foreground bg-card text-center relative z-10"
                            >
                                <div
                                    className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-foreground border-[3px] border-foreground mb-8 ${step.circleBg}`}
                                >
                                    {step.number}
                                </div>
                                <h3 className="text-xl font-black text-foreground mb-4">{step.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonial */}
            <section className="py-24 bg-card">
                <div className="container mx-auto max-w-5xl px-4 md:px-8">
                    <div className="rounded-[2.5rem] border-[3px] border-foreground bg-primary/10 p-8 md:p-14">
                        <p className="text-2xl md:text-3xl font-black italic text-foreground leading-snug mb-8">
                            &ldquo;Finding a tutor who actually understands how my son learns was a
                            challenge until we found TutorCourt. His grades in Physics jumped from a C
                            to an A within one term.&rdquo;
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 border-[3px] border-foreground rounded-[1rem] overflow-hidden flex-shrink-0">
                                <img
                                    src="https://images.unsplash.com/photo-1743871698163-a2e470d8eac7?auto=format&fit=crop&q=80&w=200"
                                    alt="Mrs. Funmi Balogun"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-foreground leading-none mb-1">
                                    Mrs. Funmi Balogun
                                </h4>
                                <p className="text-sm font-semibold text-muted-foreground">
                                    Parent of a Year 11 student
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 px-4 md:px-8 bg-background">
                <div className="container mx-auto max-w-7xl">
                    <div className="relative overflow-hidden bg-primary rounded-[3rem] border-2 border-foreground px-6 py-20 text-center flex flex-col items-center">
                        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-tutor-red-500 rounded-full" />
                        <div className="absolute -top-16 -right-16 w-48 h-48 bg-tutor-purple-200 rounded-full" />
                        <div className="relative z-10 max-w-3xl w-full">
                            <h2 className="text-4xl md:text-6xl font-black text-foreground mb-6 leading-tight">
                                Your child&apos;s breakthrough starts today.
                            </h2>
                            <p className="text-lg md:text-xl font-bold text-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                                Join thousands of parents who found the perfect tutor — and never
                                looked back.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    href="/search"
                                    className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 font-black py-4 px-10 rounded-full text-lg transition-colors"
                                >
                                    Find a tutor now
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="w-full sm:w-auto bg-background text-foreground hover:bg-background/90 font-black py-4 px-10 rounded-full text-lg transition-colors border-2 border-foreground"
                                >
                                    Create free account
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}

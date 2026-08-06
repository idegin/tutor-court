import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
    HiArrowRight,
    HiBanknotes,
    HiShieldCheck,
    HiCalendarDays,
    HiVideoCamera,
    HiMegaphone,
    HiAdjustmentsHorizontal,
    HiSparkles,
} from 'react-icons/hi2'

export const metadata: Metadata = {
    title: 'For Tutors | TutorCourt',
    description:
        'Teach what you love, set your own rate and get paid on time — every time. Join TutorCourt and turn your expertise into a thriving tutoring business.',
}

const benefits = [
    {
        icon: HiBanknotes,
        title: 'Set your own rate',
        description:
            'You are the expert — you decide what an hour of your time is worth. Charge in NGN or USD and keep the lion’s share.',
        bg: 'bg-primary/20',
        color: 'text-primary',
    },
    {
        icon: HiShieldCheck,
        title: 'Get paid, guaranteed',
        description:
            'Parents fund lessons into escrow before you teach. Deliver the class and the money is released to you — no chasing invoices.',
        bg: 'bg-tutor-red-100 dark:bg-tutor-red-900/50',
        color: 'text-tutor-red-800 dark:text-tutor-red-300',
    },
    {
        icon: HiCalendarDays,
        title: 'Teach on your schedule',
        description:
            'Publish the hours that suit you. Students book around your availability — full-time income or a side hustle, your call.',
        bg: 'bg-tutor-purple-100 dark:bg-tutor-purple-900/50',
        color: 'text-tutor-purple-800 dark:text-tutor-purple-300',
    },
    {
        icon: HiVideoCamera,
        title: 'Everything to teach online',
        description:
            'A built-in virtual classroom with whiteboard, screen share and session recording. No extra tools, no extra cost.',
        bg: 'bg-muted',
        color: 'text-foreground',
    },
    {
        icon: HiMegaphone,
        title: 'Students come to you',
        description:
            'A polished profile puts you in front of thousands of active families searching for exactly what you teach.',
        bg: 'bg-primary/20',
        color: 'text-primary',
    },
    {
        icon: HiAdjustmentsHorizontal,
        title: 'You run the classroom',
        description:
            'Build classes, set schedules, manage students and track your earnings — all from one clean tutor dashboard.',
        bg: 'bg-tutor-purple-100 dark:bg-tutor-purple-900/50',
        color: 'text-tutor-purple-800 dark:text-tutor-purple-300',
    },
]

const steps = [
    {
        number: '1',
        title: 'Apply in minutes',
        description: 'Create your profile, list your subjects and set your rate. It is free to join.',
        circleBg: 'bg-primary',
    },
    {
        number: '2',
        title: 'Get verified',
        description: 'We confirm your credentials so families can book you with total confidence.',
        circleBg: 'bg-tutor-purple-300',
    },
    {
        number: '3',
        title: 'Teach and earn',
        description: 'Accept bookings, run your classes and get paid securely after every session.',
        circleBg: 'bg-tutor-red-500',
    },
]

export default function ForTutorsPage() {
    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden bg-card pt-24 pb-24">
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute left-[-5%] top-[10%] w-[300px] h-[300px] md:w-[480px] md:h-[480px] bg-primary/10 rounded-full" />
                    <div className="absolute right-[5%] bottom-[6%] w-[120px] h-[120px] md:w-[200px] md:h-[200px] bg-tutor-purple-200/60 rounded-full" />
                </div>

                <div className="container relative z-10 mx-auto max-w-7xl px-4 md:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                        <div className="order-2 lg:order-1 relative h-[420px] md:h-[520px] w-full">
                            <div className="absolute inset-0 rounded-[2.5rem] border-[3px] border-foreground overflow-hidden bg-muted">
                                <img
                                    src="https://images.unsplash.com/photo-1620829813573-7c9e1877706f?auto=format&fit=crop&q=80&w=1000"
                                    alt="Tutor teaching an online lesson on a laptop"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-6 -right-4 md:-right-8 z-20 bg-tutor-red-500 p-5 md:p-6 rounded-[1.75rem] border-[3px] border-foreground w-[230px] md:w-[270px]">
                                <p className="text-3xl md:text-4xl font-black text-white leading-none mb-2">
                                    You set the price
                                </p>
                                <p className="text-white/90 font-bold text-sm leading-snug">
                                    Keep more of what you earn, paid in NGN or USD
                                </p>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2">
                            <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-background px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-6">
                                <HiSparkles className="w-4 h-4 text-primary" />
                                For Tutors
                            </span>
                            <h1 className="text-4xl md:text-6xl lg:text-[4.25rem] font-black tracking-tight text-foreground leading-[1.05] mb-6">
                                Teach what you love.{' '}
                                <span className="relative inline-block">
                                    <span className="italic text-primary relative z-10">Earn what you deserve.</span>
                                    <span className="absolute bottom-1 left-0 w-full h-[10px] bg-tutor-purple-200 z-0 rounded-sm" />
                                </span>
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl font-medium leading-relaxed">
                                Turn your expertise into a thriving tutoring business. Set your rate,
                                pick your hours, and get paid on time — every single time.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/auth/register?type=tutor"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-tutor-red-500 px-8 py-4 text-lg font-black text-white hover:bg-tutor-red-600 transition-colors"
                                >
                                    Start teaching
                                    <HiArrowRight className="w-5 h-5" />
                                </Link>
                                <Link
                                    href="/search"
                                    className="inline-flex items-center justify-center rounded-full border-2 border-foreground bg-background px-8 py-4 text-lg font-black text-foreground hover:bg-muted transition-colors"
                                >
                                    See who&apos;s teaching
                                </Link>
                            </div>
                            <p className="mt-4 text-sm font-semibold text-muted-foreground">
                                Free to join · Keep control of your rate · Secure escrow payouts
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats strip */}
            <section className="bg-foreground text-background py-8">
                <div className="container mx-auto max-w-7xl px-4 md:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        {[
                            { stat: 'Your rate', label: 'You set the price' },
                            { stat: 'NGN & USD', label: 'Get paid your way' },
                            { stat: 'Escrow', label: 'Guaranteed payouts' },
                            { stat: '2,000+', label: 'Active families' },
                        ].map((item) => (
                            <div key={item.label}>
                                <p className="text-xl md:text-3xl font-black text-primary mb-1">{item.stat}</p>
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
                            Why tutors choose us
                        </p>
                        <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight">
                            Built for tutors who mean business.
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
                        <p className="text-sm font-bold tracking-[0.2em] text-primary uppercase mb-4">
                            Get started
                        </p>
                        <h2 className="text-4xl md:text-5xl font-black text-foreground">
                            Teaching in three simple steps
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
                            &ldquo;TutorCourt gave me a full timetable without the hustle of finding
                            students myself. I set my rate, teach from home, and the payment is always
                            there when the lesson ends.&rdquo;
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 border-[3px] border-foreground rounded-[1rem] overflow-hidden flex-shrink-0">
                                <img
                                    src="https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&q=80&w=200"
                                    alt="Emeka Okafor"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-foreground leading-none mb-1">
                                    Emeka Okafor
                                </h4>
                                <p className="text-sm font-semibold text-muted-foreground">
                                    Mathematics Tutor · Lagos
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
                        <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-tutor-red-500 rounded-full" />
                        <div className="absolute -top-16 -left-16 w-48 h-48 bg-tutor-purple-200 rounded-full" />
                        <div className="relative z-10 max-w-3xl w-full">
                            <h2 className="text-4xl md:text-6xl font-black text-foreground mb-6 leading-tight">
                                Your classroom is waiting.
                            </h2>
                            <p className="text-lg md:text-xl font-bold text-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                                Join the tutors building real income doing what they do best. It takes
                                two minutes to start.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    href="/auth/register?type=tutor"
                                    className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 font-black py-4 px-10 rounded-full text-lg transition-colors"
                                >
                                    Become a tutor
                                </Link>
                                <Link
                                    href="/auth/login"
                                    className="w-full sm:w-auto bg-background text-foreground hover:bg-background/90 font-black py-4 px-10 rounded-full text-lg transition-colors border-2 border-foreground"
                                >
                                    I already have an account
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}

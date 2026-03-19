"use client"

import { Button } from "@/components/ui/button"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import { WwwLayout } from "@/components/layout/www-layout"
import { FaStar, FaChevronRight } from "react-icons/fa6"
import Link from "next/link"

const tutors = [
    {
        id: 1,
        name: "Dr. Adewale",
        subject: "MATHEMATICS EXPERT",
        subjectColor: "text-primary",
        rating: "4.9",
        classes: "1.2k",
        imageGrad: "from-blue-100 to-slate-200 dark:from-blue-900/40 dark:to-slate-800/40",
    },
    {
        id: 2,
        name: "Mrs. Okonkwo",
        subject: "ENGLISH LITERATURE",
        subjectColor: "text-tutor-purple-500",
        rating: "5.0",
        classes: "800+",
        imageGrad: "from-orange-100 to-amber-200 dark:from-orange-900/40 dark:to-amber-800/40",
    },
    {
        id: 3,
        name: "Mr. Ibrahim",
        subject: "PHYSICS & ROBOTICS",
        subjectColor: "text-tutor-purple-600", // Teal is not strictly in our theme yet, assuming fallback or similar color for now, let's use tutor-purple or primary for visual consistency
        rating: "4.8",
        classes: "2.5k",
        imageGrad: "from-slate-200 to-zinc-300 dark:from-slate-800 dark:to-zinc-800",
    },
    {
        id: 4,
        name: "Ms. Amadi",
        subject: "CREATIVE WRITING",
        subjectColor: "text-tutor-purple-500",
        rating: "4.9",
        classes: "450",
        imageGrad: "from-zinc-200 to-stone-200 dark:from-zinc-800 dark:to-stone-800",
    },
]

export function TutorsSection() {
    return (
        <section className="bg-muted/30 py-16 sm:py-24">
            <WwwLayout>
                <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-5xl">
                            Learn from the Best
                        </h2>
                        <p className="mt-3 text-lg text-muted-foreground">
                            World-class tutors specialized in the Nigerian and International curricula.
                        </p>
                    </div>
                    <Link
                        href="#tutors"
                        className="inline-flex flex-shrink-0 items-center gap-2 font-bold text-primary transition-colors hover:text-primary/80"
                    >
                        View More <FaChevronRight className="size-3" />
                    </Link>
                </div>

                <div className="relative">
                    <Carousel
                        opts={{
                            align: "start",
                            loop: true,
                        }}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-4 sm:-ml-6">
                            {tutors.map((tutor) => (
                                <CarouselItem
                                    key={tutor.id}
                                    className="pl-4 sm:pl-6 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                                >
                                    <div className="flex h-full flex-col overflow-hidden rounded-3xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                                        <div
                                            className={`mb-4 aspect-square w-full rounded-2xl bg-gradient-to-br ${tutor.imageGrad}`}
                                        />
                                        <div className="flex flex-1 flex-col px-2 pb-2">
                                            <h3 className="text-xl font-black tracking-tight text-foreground">
                                                {tutor.name}
                                            </h3>
                                            <p className={`mt-1 text-xs font-bold tracking-wider uppercase ${tutor.subjectColor}`}>
                                                {tutor.subject}
                                            </p>

                                            <div className="mt-4 mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1 text-foreground">
                                                    <FaStar className="text-yellow-400" />
                                                    <span className="font-bold">{tutor.rating}</span>
                                                </div>
                                                <span>•</span>
                                                <span>{tutor.classes} Classes taught</span>
                                            </div>

                                            <div className="mt-auto pt-2">
                                                <Button
                                                    variant="outline"
                                                    className="w-full rounded-xl border-border/60 py-6 text-sm font-bold shadow-none hover:bg-muted"
                                                >
                                                    Book a Session
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <div className="mt-8 flex items-center justify-end gap-3 hidden sm:flex">
                            <CarouselPrevious className="static translate-x-0 translate-y-0" />
                            <CarouselNext className="static translate-x-0 translate-y-0" />
                        </div>
                    </Carousel>
                </div>
            </WwwLayout>
        </section>
    )
}

import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { JsonLd } from '@/components/seo/json-ld'

export const metadata: Metadata = {
    title: 'Browse Subjects | TutorCourt',
    description: 'Explore all subjects available on TutorCourt. Find vetted expert tutors for Mathematics, Sciences, English, and more.',
    openGraph: {
        title: 'Browse Subjects | TutorCourt',
        description: 'Explore all subjects available on TutorCourt. Find vetted expert tutors for every subject.',
        type: 'website',
        url: 'https://www.tutorcourt.com/subjects',
        images: [{ url: 'https://www.tutorcourt.com/api/og?type=default', width: 1200, height: 630 }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Browse Subjects | TutorCourt',
        description: 'Explore all subjects available on TutorCourt.',
        images: ['https://www.tutorcourt.com/api/og?type=default'],
    },
    alternates: { canonical: 'https://www.tutorcourt.com/subjects' },
}

export default async function SubjectsBrowsePage() {
    const payload = await getPayload({ config: configPromise })

    const [categoriesResult, subjectsResult] = await Promise.all([
        payload.find({
            collection: 'subject-categories',
            limit: 100,
            sort: 'name',
            depth: 0,
        }),
        payload.find({
            collection: 'subjects',
            limit: 500,
            sort: 'sortOrder',
            depth: 1,
        }),
    ])

    const categories = categoriesResult.docs as any[]
    const subjects = subjectsResult.docs as any[]

    const subjectsByCategory = new Map<string, any[]>()
    const uncategorized: any[] = []

    for (const subject of subjects) {
        const catId = subject.category?.id ? String(subject.category.id) : null
        if (catId) {
            if (!subjectsByCategory.has(catId)) {
                subjectsByCategory.set(catId, [])
            }
            subjectsByCategory.get(catId)!.push(subject)
        } else {
            uncategorized.push(subject)
        }
    }

    const popularSubjects = subjects.filter((s: any) => s.isPopular)

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.tutorcourt.com' },
            { '@type': 'ListItem', position: 2, name: 'Subjects', item: 'https://www.tutorcourt.com/subjects' },
        ],
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            <JsonLd data={breadcrumbSchema} />

            <section className="relative bg-card pt-24 pb-20 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute right-[-5%] top-[5%] w-[300px] h-[300px] md:w-[480px] md:h-[480px] bg-primary/10 rounded-full" />
                    <div className="absolute left-[2%] bottom-[5%] w-[120px] h-[120px] md:w-[200px] md:h-[200px] bg-tutor-purple-100/60 rounded-full" />
                </div>
                <div className="container relative z-10 mx-auto max-w-7xl px-4 md:px-8">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 mb-6">
                            <Link href="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Home</Link>
                            <span className="text-muted-foreground/50">/</span>
                            <span className="text-sm font-semibold text-foreground">Subjects</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-[1.05] mb-6">
                            Browse Subjects
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed">
                            Find tutors for every subject — from Mathematics to Fine Art
                        </p>
                    </div>
                </div>
            </section>

            <div className="container mx-auto max-w-7xl px-4 md:px-8 mt-16 flex flex-col gap-20">

                {popularSubjects.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <span className="text-2xl">⭐</span>
                            <h2 className="text-2xl md:text-3xl font-black text-foreground">Popular Subjects</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {popularSubjects.map((subject: any) => (
                                <SubjectCard key={subject.id} subject={subject} />
                            ))}
                        </div>
                    </section>
                )}

                {categories.map((category: any) => {
                    const catSubjects = subjectsByCategory.get(String(category.id)) || []
                    if (catSubjects.length === 0) return null

                    return (
                        <section key={category.id}>
                            <div className="flex items-center gap-3 mb-8">
                                {category.icon && <span className="text-2xl">{category.icon}</span>}
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-foreground">{category.name}</h2>
                                    {category.description && (
                                        <p className="text-muted-foreground text-sm mt-1">{category.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {catSubjects.map((subject: any) => (
                                    <SubjectCard key={subject.id} subject={subject} categoryColor={category.color} />
                                ))}
                            </div>
                        </section>
                    )
                })}

                {uncategorized.length > 0 && (
                    <section>
                        <h2 className="text-2xl md:text-3xl font-black text-foreground mb-8">Other Subjects</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {uncategorized.map((subject: any) => (
                                <SubjectCard key={subject.id} subject={subject} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}

function SubjectCard({ subject, categoryColor }: { subject: any; categoryColor?: string }) {
    const accentColor = subject.color || categoryColor || '#4FF397'
    if (!subject.id) return null

    return (
        <Link
            href={`/search?subject=${subject.id}`}
            className="group flex flex-col rounded-2xl border-[2.5px] border-foreground overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
        >
            <div
                className="h-3 w-full"
                style={{ background: accentColor }}
            />
            <div className="flex flex-col gap-2 p-4 bg-background">
                {subject.icon && (
                    <span className="text-3xl leading-none mb-1">{subject.icon}</span>
                )}
                <div className="flex items-start justify-between gap-1">
                    <h3 className="text-base font-black text-foreground leading-tight group-hover:text-primary transition-colors">
                        {subject.name}
                    </h3>
                    {subject.isPopular && (
                        <span className="shrink-0 text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                            Popular
                        </span>
                    )}
                </div>
                {subject.shortDescription && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {subject.shortDescription}
                    </p>
                )}
                <span className="mt-1 text-xs font-bold text-primary flex items-center gap-1">
                    Find tutors →
                </span>
            </div>
        </Link>
    )
}

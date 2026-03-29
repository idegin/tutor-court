"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { HiMagnifyingGlass } from 'react-icons/hi2'
import { useOptions } from '@/components/providers/options-provider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRouter } from 'next13-progressbar'

export function SiteHero() {
    const router = useRouter()
    const { subjects } = useOptions()
    const dropdownRef = useRef<HTMLFormElement>(null)

    const [query, setQuery] = useState('')
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    const subjectOptions = useMemo(
        () =>
            (subjects || [])
                .map((subject: any) => ({ id: String(subject.id), name: String(subject.name) }))
                .filter((subject) => subject.id && subject.name),
        [subjects],
    )

    const filteredSubjects = useMemo(() => {
        const normalized = query.trim().toLowerCase()

        if (!normalized) {
            return subjectOptions.slice(0, 10)
        }

        return subjectOptions
            .filter((subject) => subject.name.toLowerCase().includes(normalized))
            .slice(0, 10)
    }, [query, subjectOptions])

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!dropdownRef.current) return

            if (!dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
        }
    }, [])

    const handleSubjectSelect = (subject: { id: string; name: string }) => {
        setSelectedSubjectId(subject.id)
        setQuery(subject.name)
        setIsOpen(false)
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const trimmedQuery = query.trim()
        if (!trimmedQuery) {
            router.push('/search')
            return
        }

        let matchedSubject = subjectOptions.find((subject) => subject.id === selectedSubjectId)

        if (!matchedSubject || matchedSubject.name.toLowerCase() !== trimmedQuery.toLowerCase()) {
            matchedSubject = subjectOptions.find(
                (subject) => subject.name.toLowerCase() === trimmedQuery.toLowerCase(),
            )
        }

        if (!matchedSubject && filteredSubjects.length > 0) {
            matchedSubject = filteredSubjects[0]
        }

        if (!matchedSubject) {
            setIsOpen(true)
            return
        }

        router.push(`/search?subject=${encodeURIComponent(matchedSubject.id)}`)
    }

    const handleInputChange = (value: string) => {
        setQuery(value)
        setIsOpen(true)

        if (!value.trim()) {
            setSelectedSubjectId(null)
            return
        }

        const exactMatch = subjectOptions.find(
            (subject) => subject.name.toLowerCase() === value.trim().toLowerCase(),
        )
        setSelectedSubjectId(exactMatch?.id ?? null)
    }

    return (
        <div className="relative min-h-[80vh] flex flex-col items-center pt-24 pb-32 bg-card">
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute right-[-5%] top-[10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-tutor-purple-50 rounded-full"></div>
                <div className="absolute left-[5%] bottom-[5%] w-[100px] h-[100px] md:w-[200px] md:h-[200px] bg-primary/20 rounded-full"></div>
            </div>

            <div className="container relative z-10 px-4 md:px-8 mx-auto flex flex-col justify-center max-w-7xl">
                <div className="max-w-3xl pt-10">
                    <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight text-foreground leading-[1.05] mb-6">
                        Fine qualified <br className="hidden md:block" />
                        <span className="relative inline-block">
                            <span className="italic text-primary relative z-10">tutors</span>
                            <span className="absolute bottom-2 left-0 w-full h-[10px] bg-tutor-purple-200 z-0 rounded-sm"></span>
                        </span>
                        ,<br className="hidden md:block" /> curated for you.
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-xl font-medium leading-relaxed">
                        Expert tutors tailored to your learning style. Find, book,
                        and excel with TutorCourt's editorial experience.
                    </p>

                    <form onSubmit={handleSubmit} className="w-full max-w-4xl relative z-10" ref={dropdownRef}>
                        <div className="flex flex-col md:flex-row gap-3 rounded-3xl border-2 border-foreground bg-card p-3">
                            <div className="relative flex-1">
                                <Input
                                    value={query}
                                    onFocus={() => setIsOpen(true)}
                                    onChange={(event) => handleInputChange(event.target.value)}
                                    placeholder="Search subject, e.g. Mathematics"
                                    className="h-14 rounded-2xl border-0 bg-none bg-transparent px-5 text-base font-semibold text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                                    aria-label="Search subject"
                                />

                                {isOpen && (
                                    <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 rounded-2xl border-2 border-foreground bg-card p-2 max-h-72 overflow-y-auto z-50">
                                        {filteredSubjects.length === 0 ? (
                                            <div className="px-3 py-3 text-sm font-medium text-muted-foreground">
                                                No matching subjects found
                                            </div>
                                        ) : (
                                            <ul className="space-y-1">
                                                {filteredSubjects.map((subject) => {
                                                    const isSelected = selectedSubjectId === subject.id

                                                    return (
                                                        <li key={subject.id}>
                                                            <button
                                                                type="button"
                                                                onMouseDown={(event) => event.preventDefault()}
                                                                onClick={() => handleSubjectSelect(subject)}
                                                                className={cn(
                                                                    'w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                                                                    isSelected
                                                                        ? 'bg-primary text-primary-foreground'
                                                                        : 'text-foreground hover:bg-muted',
                                                                )}
                                                            >
                                                                {subject.name}
                                                            </button>
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="h-14 rounded-2xl bg-tutor-red-500 px-8 text-white hover:bg-tutor-red-600"
                            >
                                <HiMagnifyingGlass className="size-5" />
                                Find Tutors
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

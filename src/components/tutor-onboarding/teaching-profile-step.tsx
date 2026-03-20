"use client";
import React, { useState, useEffect } from 'react'
import { HiArrowRight as ArrowRight, HiArrowLeft as ArrowLeft, HiXMark as XMark } from 'react-icons/hi2'
import * as z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useAuth } from '@/components/providers/auth-provider'
import { useOptions } from '@/components/providers/options-provider'

const teachingProfileSchema = z.object({
    subjects: z.array(z.string()).min(1, 'Please select at least one subject'),
    yearsOfExperience: z.number().min(0, 'Years of experience must be 0 or more').max(100),
    hourlyRate: z.number().min(500, 'Minimum hourly rate is 500 NGN'),
    bio: z.string().min(10, 'Your bio is too short.').max(500, 'Bio must be at most 500 characters'),
})

type TeachingProfileStepProps = {
    onNext: () => void
    onBack?: () => void
}

export function TeachingProfileStep({ onNext, onBack }: TeachingProfileStepProps) {
    const { tutorProfile } = useAuth()
    const { subjects } = useOptions()
    const queryClient = useQueryClient()

    const [values, setValues] = useState<{
        subjects: string[],
        yearsOfExperience: number | '',
        hourlyRate: number | '',
        bio: string
    }>({
        subjects: tutorProfile?.subjects?.map((s: any) => typeof s === 'string' ? s : s.id) || [],
        yearsOfExperience: tutorProfile?.yearsOfExperience ?? '',
        hourlyRate: tutorProfile?.hourlyRate ?? '',
        bio: tutorProfile?.bio || '',
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/private/tutor', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })
            if (!res.ok) {
                const result = await res.json()
                throw new Error(result.error || 'Failed to update profile')
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth'] }) // Optional
            onNext()
        },
        onError: (err: any) => {
            setErrors(prev => ({ ...prev, form: err.message }))
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const result = teachingProfileSchema.safeParse({
            ...values,
            yearsOfExperience: values.yearsOfExperience === '' ? undefined : Number(values.yearsOfExperience),
            hourlyRate: values.hourlyRate === '' ? undefined : Number(values.hourlyRate),
        })

        if (!result.success) {
            const formattedErrors: Record<string, string> = {}
            result.error.issues.forEach((err: any) => {
                if (err.path[0]) {
                    formattedErrors[err.path[0].toString()] = err.message
                }
            })
            setErrors(formattedErrors)
            return
        }
        setErrors({})
        mutation.mutate(result.data)
    }

    const handleChange = (field: string, value: any) => {
        setValues((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }))
        }
    }

    const handleSubjectSelect = (selectedOption: any) => {
        if (!selectedOption) return;
        const newSubjectId = selectedOption.value;
        if (!values.subjects.includes(newSubjectId)) {
            handleChange('subjects', [...values.subjects, newSubjectId]);
        }
    }

    const handleRemoveSubject = (idToRemove: string) => {
        handleChange('subjects', values.subjects.filter(id => id !== idToRemove));
    }

    const subjectOptions = subjects.map(s => ({ label: s.name, value: s.id }))

    return (
        <div className="flex flex-col max-w-xl w-full mx-auto md:ml-0 md:mr-auto justify-center">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-foreground">Step 2 of 3</span>
                <span className="text-sm font-semibold text-primary">66% Complete</span>
            </div>
            <Progress value={66} className="h-2 mb-6" />

            <div className="flex items-center gap-3">
                {onBack && (
                    <button onClick={onBack} className="h-8 min-w-8 rounded-full mb-4 mt-1 bg-muted hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors">
                        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                    </button>
                )}
                <span className="text-sm text-muted-foreground mb-4">Teaching Profile</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3 leading-tight">
                Build your teaching profile
            </h1>
            <p className="text-[1.05rem] text-muted-foreground mb-8">
                Tell us about your expertise to help students find the right match.
            </p>

            {errors.form && (
                <div className="mb-4 p-4 text-sm text-destructive-foreground bg-destructive/10 rounded-xl border border-destructive/20 font-medium">
                    {errors.form}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                <div className="space-y-2">
                    <Label className="font-bold text-foreground">Subjects You Teach</Label>
                    <SearchableSelect
                        placeholder="Select subjects..."
                        options={subjectOptions}
                        value={null}
                        onChange={handleSubjectSelect}
                        error={!!errors.subjects}
                        isClearable={false}
                        components={{ IndicatorSeparator: () => null }}
                    />
                    
                    {values.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {values.subjects.map(subjectId => {
                                const subjectInfo = subjects.find(s => s.id === subjectId)
                                return (
                                    <div key={subjectId} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-semibold">
                                        <span>{subjectInfo?.name || subjectId}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSubject(subjectId)}
                                            className="hover:text-primary/70 transition-colors"
                                        >
                                            <XMark className="h-4 w-4" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    {errors.subjects && <p className="text-sm text-destructive font-medium">{errors.subjects}</p>}
                </div>

                <div className="space-y-2">
                    <Label className="font-bold text-foreground">Years of Experience</Label>
                    <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 5"
                        value={values.yearsOfExperience}
                        onChange={(e) => handleChange('yearsOfExperience', e.target.value ? Number(e.target.value) : '')}
                        className={`h-12 rounded-xl text-[15px] ${errors.yearsOfExperience ? 'border-destructive focus-visible:ring-destructive' : 'border-input'}`}
                    />
                    {errors.yearsOfExperience && <p className="text-sm text-destructive font-medium">{errors.yearsOfExperience}</p>}
                </div>

                <div className="space-y-2">
                    <Label className="font-bold text-foreground">Hourly Rate (₦)</Label>
                    <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 5000"
                        value={values.hourlyRate}
                        onChange={(e) => handleChange('hourlyRate', e.target.value ? Number(e.target.value) : '')}
                        className={`h-12 rounded-xl text-[15px] ${errors.hourlyRate ? 'border-destructive focus-visible:ring-destructive' : 'border-input'}`}
                    />
                    {errors.hourlyRate && <p className="text-sm text-destructive font-medium">{errors.hourlyRate}</p>}
                </div>

                <div className="space-y-2">
                    <Label className="font-bold text-foreground">Short Bio</Label>
                    <Textarea
                        placeholder="Briefly describe your teaching style and academic background..."
                        value={values.bio}
                        onChange={(e) => handleChange('bio', e.target.value)}
                        className={`min-h-[120px] rounded-xl text-[15px] resize-none ${errors.bio ? 'border-destructive focus-visible:ring-destructive' : 'border-input'}`}
                    />
                    <div className="flex justify-between items-center text-sm mt-1">
                        {errors.bio ? (
                            <span className="text-destructive font-medium">{errors.bio}</span>
                        ) : (
                            <span />
                        )}
                        <span className="text-muted-foreground font-medium">
                            {values.bio.length} / 500 characters
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-border">
                    <Button type="button" variant="outline" size="lg" onClick={onBack} disabled={mutation.isPending} className="w-full sm:w-1/3 h-12 text-[15px] font-bold rounded-xl shadow-sm">
                        Back
                    </Button>
                    <Button type="submit" size="lg" disabled={mutation.isPending} className="w-full sm:w-2/3 h-12 text-[15px] font-bold rounded-xl shadow-sm">
                        {mutation.isPending ? 'Saving...' : (
                            <>Continue to Preferences <ArrowRight className="ml-2 h-4 w-4" /></>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}

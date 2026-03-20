"use client";
import React, { useState, useEffect } from 'react'
import { HiArrowRight as ArrowRight, HiArrowLeft as ArrowLeft, HiVideoCamera as VideoCamera, HiHome as Home } from 'react-icons/hi2'
import * as z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/components/providers/auth-provider'

const preferencesSchema = z.object({
    mode: z.enum(['online', 'hybrid'], { message: 'Please select a tutoring mode' }),
    usagePlan: z.enum(['existing', 'marketplace', 'both'], { message: 'Please select how you plan to use TutorCourt' }),
})

type PreferencesStepProps = {
    onComplete: () => void
    onBack: () => void
}

export function PreferencesStep({ onComplete, onBack }: PreferencesStepProps) {
    const { tutorProfile } = useAuth()
    const queryClient = useQueryClient()

    const [values, setValues] = useState({
        mode: tutorProfile?.mode || 'online',
        usagePlan: tutorProfile?.usagePlan || '',
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
                throw new Error(result.error || 'Failed to update preferences')
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth'] })
            onComplete()
        },
        onError: (err: any) => {
            setErrors(prev => ({ ...prev, form: err.message }))
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const result = preferencesSchema.safeParse(values)
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
        mutation.mutate({
            ...result.data,
            onboardingCompleted: true,
        })
    }

    const handleChange = (field: string, value: string) => {
        setValues((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }))
        }
    }

    return (
        <div className="flex flex-col max-w-xl w-full mx-auto md:ml-0 md:mr-auto justify-center">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-foreground">Step 3 of 3</span>
                <span className="text-sm font-semibold text-primary">100% Complete</span>
            </div>
            <Progress value={100} className="h-2 mb-6" />

            <div className="flex items-center gap-3">
                <button onClick={onBack} className="h-8 min-w-8 rounded-full mb-4 mt-1 bg-muted hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-8 leading-tight">
                Preferences & Setup
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">

                <div className="space-y-4">
                    <h3 className="font-bold text-foreground text-base">
                        Tutoring Mode
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div
                            onClick={() => handleChange('mode', 'online')}
                            className={`flex flex-col p-5 cursor-pointer rounded-xl border-2 transition-all ${values.mode === 'online' ? 'border-primary bg-primary/5' : 'border-border hover:border-accent-foreground/20 bg-background'}`}
                        >
                            <VideoCamera className={`h-6 w-6 mb-3 ${values.mode === 'online' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <p className="font-bold text-base text-foreground mb-1">Online only</p>
                            <p className="text-sm text-muted-foreground">Sessions via video call</p>
                        </div>

                        <div
                            onClick={() => handleChange('mode', 'hybrid')}
                            className={`flex flex-col p-5 cursor-pointer rounded-xl border-2 transition-all ${values.mode === 'hybrid' ? 'border-primary bg-primary/5' : 'border-border hover:border-accent-foreground/20 bg-background'}`}
                        >
                            <Home className={`h-6 w-6 mb-3 ${values.mode === 'hybrid' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <p className="font-bold text-base text-foreground mb-1">Hybrid</p>
                            <p className="text-sm text-muted-foreground">Remote & in-person options</p>
                        </div>
                    </div>
                    {errors.mode && <p className="text-sm text-destructive font-medium">{errors.mode}</p>}
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-foreground text-base">
                        How do you plan to use TutorCourt?
                    </h3>

                    <div className="flex flex-col gap-3">
                        <label className={`flex items-start gap-4 p-5 cursor-pointer rounded-xl border transition-all ${values.usagePlan === 'existing' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50 bg-background'}`}>
                            <Checkbox
                                checked={values.usagePlan === 'existing'}
                                onCheckedChange={() => handleChange('usagePlan', 'existing')}
                                className="mt-1 h-5 w-5 rounded border-2 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <div className="flex flex-col">
                                <p className="font-bold text-[15px] text-foreground mb-0.5">Use TutorCourt with my existing students</p>
                                <p className="text-sm text-muted-foreground">Manage invoicing and scheduling for current clients</p>
                            </div>
                        </label>

                        <label className={`flex items-start gap-4 p-5 cursor-pointer rounded-xl border transition-all ${values.usagePlan === 'marketplace' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50 bg-background'}`}>
                            <Checkbox
                                checked={values.usagePlan === 'marketplace'}
                                onCheckedChange={() => handleChange('usagePlan', 'marketplace')}
                                className="mt-1 h-5 w-5 rounded border-2 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <div className="flex flex-col">
                                <p className="font-bold text-[15px] text-foreground mb-0.5">Apply to be listed on TutorCourt marketplace</p>
                                <p className="text-sm text-muted-foreground">Get discovered by new students looking for your expertise</p>
                            </div>
                        </label>

                        <label className={`flex items-start gap-4 p-5 cursor-pointer rounded-xl border transition-all ${values.usagePlan === 'both' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50 bg-background'}`}>
                            <Checkbox
                                checked={values.usagePlan === 'both'}
                                onCheckedChange={() => handleChange('usagePlan', 'both')}
                                className="mt-1 h-5 w-5 rounded border-2 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <div className="flex flex-col">
                                <p className="font-bold text-[15px] text-foreground mb-0.5">Both</p>
                                <p className="text-sm text-muted-foreground">The full TutorCourt experience for all your students</p>
                            </div>
                        </label>
                    </div>
                    {errors.usagePlan && <p className="text-sm text-destructive font-medium">{errors.usagePlan}</p>}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-border">
                    <Button type="button" variant="outline" size="lg" onClick={onBack} disabled={mutation.isPending} className="w-full sm:w-1/3 h-12 text-[15px] font-bold rounded-xl border-border shadow-sm">
                        Back
                    </Button>
                    <Button type="submit" size="lg" disabled={mutation.isPending} className="w-full sm:w-2/3 h-12 text-[15px] font-bold rounded-xl shadow-sm group">
                        {mutation.isPending ? 'Saving...' : 'Complete Profile'}
                        {!mutation.isPending && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                    </Button>
                </div>
            </form>
        </div>
    )
}

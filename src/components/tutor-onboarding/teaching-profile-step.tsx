import React, { useState } from 'react'
import { HiArrowRight as ArrowRight, HiArrowLeft as ArrowLeft, HiAcademicCap as AcademicCap, HiBriefcase as Briefcase } from 'react-icons/hi2'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const teachingProfileSchema = z.object({
    subjectPrimary: z.string().min(1, 'Primary subject is required'),
    subjectSecondary: z.string().optional(),
    yearsExperience: z.string().min(1, 'Years of experience is required'),
    educationLevel: z.string().min(1, 'Education level is required'),
    certifications: z.boolean().optional(),
})

type TeachingProfileStepProps = {
    onNext: () => void
    onBack?: () => void
}

export function TeachingProfileStep({ onNext, onBack }: TeachingProfileStepProps) {
    const [values, setValues] = useState({
        subjectPrimary: '',
        subjectSecondary: '',
        yearsExperience: '',
        educationLevel: '',
        certifications: false,
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const result = teachingProfileSchema.safeParse(values)
        if (!result.success) {
            const formattedErrors: Record<string, string> = {}
            result.error.errors.forEach((err) => {
                if (err.path[0]) {
                    formattedErrors[err.path[0].toString()] = err.message
                }
            })
            setErrors(formattedErrors)
            return
        }
        setErrors({})
        console.log('Teaching Profile:', values)
        onNext()
    }

    const handleChange = (field: string, value: string | boolean) => {
        setValues((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }))
        }
    }

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
                What do you teach?
            </h1>
            <p className="text-[1.05rem] text-muted-foreground mb-8">
                Share your expertise and credentials with potential students.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <AcademicCap className="h-5 w-5 text-primary" />
                        Subjects & Expertise
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold">Primary Subject</Label>
                            <Select value={values.subjectPrimary} onValueChange={(val) => handleChange('subjectPrimary', val)}>
                                <SelectTrigger className="h-12 rounded-xl border-input">
                                    <SelectValue placeholder="Mathematics" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="math">Mathematics</SelectItem>
                                    <SelectItem value="science">Science</SelectItem>
                                    <SelectItem value="english">English</SelectItem>
                                    <SelectItem value="history">History</SelectItem>
                                    <SelectItem value="languages">Languages</SelectItem>
                                    <SelectItem value="test-prep">Test Prep (SAT, ACT, etc.)</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.subjectPrimary && <p className="text-sm text-destructive font-medium">{errors.subjectPrimary}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold">Secondary Subject (Optional)</Label>
                            <Select value={values.subjectSecondary} onValueChange={(val) => handleChange('subjectSecondary', val)}>
                                <SelectTrigger className="h-12 rounded-xl border-input">
                                    <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="math">Mathematics</SelectItem>
                                    <SelectItem value="science">Science</SelectItem>
                                    <SelectItem value="english">English</SelectItem>
                                    <SelectItem value="history">History</SelectItem>
                                    <SelectItem value="languages">Languages</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.subjectSecondary && <p className="text-sm text-destructive font-medium">{errors.subjectSecondary}</p>}
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-border my-2" />

                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Experience & Education
                    </h3>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold">Years of Experience</Label>
                        <Select value={values.yearsExperience} onValueChange={(val) => handleChange('yearsExperience', val)}>
                            <SelectTrigger className="h-12 rounded-xl border-input">
                                <SelectValue placeholder="Select experience level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0-2">0-2 years</SelectItem>
                                <SelectItem value="3-5">3-5 years</SelectItem>
                                <SelectItem value="6-10">6-10 years</SelectItem>
                                <SelectItem value="10+">10+ years</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.yearsExperience && <p className="text-sm text-destructive font-medium">{errors.yearsExperience}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold">Highest Education Level</Label>
                        <Select value={values.educationLevel} onValueChange={(val) => handleChange('educationLevel', val)}>
                            <SelectTrigger className="h-12 rounded-xl border-input">
                                <SelectValue placeholder="Select education level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="high-school">High School</SelectItem>
                                <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                                <SelectItem value="masters">Master's Degree</SelectItem>
                                <SelectItem value="phd">Doctorate (Ph.D.)</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.educationLevel && <p className="text-sm text-destructive font-medium">{errors.educationLevel}</p>}
                    </div>

                    <div className="flex items-center space-x-3 bg-muted/50 p-4 rounded-xl border border-border mt-4">
                        <Checkbox
                            id="certifications"
                            checked={values.certifications}
                            onCheckedChange={(val) => handleChange('certifications', val as boolean)}
                            className="h-5 w-5 rounded-md border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="space-y-1 leading-none">
                            <label htmlFor="certifications" className="text-sm font-bold leading-none cursor-pointer">
                                I have teaching certifications
                            </label>
                            <p className="text-[13px] text-muted-foreground mt-1">
                                (State teaching license, TEFL/TESOL, specialized training)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-border">
                    <Button type="button" variant="outline" size="lg" onClick={onBack} className="w-full sm:w-1/3 h-12 text-[15px] font-bold rounded-xl shadow-sm">
                        Back
                    </Button>
                    <Button type="submit" size="lg" className="w-full sm:w-2/3 h-12 text-[15px] font-bold rounded-xl shadow-sm">
                        Continue to Preferences <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </form>
        </div>
    )
}

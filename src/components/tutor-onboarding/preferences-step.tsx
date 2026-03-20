import React, { useState } from 'react'
import { HiArrowRight as ArrowRight, HiArrowLeft as ArrowLeft, HiBanknotes as Banknotes, HiBuildingStorefront as BuildingStorefront } from 'react-icons/hi2'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const preferencesSchema = z.object({
    hourlyRate: z.string().min(1, 'Hourly rate is required'),
    teachingMode: z.string().min(1, 'Teaching mode is required'),
    availabilityDays: z.string().min(8, 'Days of availability are required'),
})

type PreferencesStepProps = {
    onComplete: () => void
    onBack: () => void
}

export function PreferencesStep({ onComplete, onBack }: PreferencesStepProps) {
    const [values, setValues] = useState({
        hourlyRate: '',
        teachingMode: '',
        availabilityDays: 'weekdays',
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

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
        console.log('Preferences:', values)
        onComplete()
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
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full mb-4 mt-1 bg-muted hover:bg-accent hover:text-accent-foreground">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </Button>
                <span className="text-sm text-muted-foreground mb-4">Location & Rates</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3 leading-tight">
                Set your rates & location
            </h1>
            <p className="text-[1.05rem] text-muted-foreground mb-8">
                How much do you want to earn and where will you teach?
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <Banknotes className="h-5 w-5 text-primary" />
                        Hourly Rate
                    </h3>
                    <div className="space-y-2">
                        <Label className="text-sm font-bold">Your Base Rate (per hour)</Label>
                        <div className="relative flex items-center">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">$</span>
                            <Input
                                placeholder="35"
                                className="h-14 rounded-xl border-input pl-8 text-lg font-semibold"
                                value={values.hourlyRate}
                                onChange={(e) => handleChange('hourlyRate', e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
                            Average rate for your subjects is $35-50/hr
                        </p>
                        {errors.hourlyRate && <p className="text-sm text-destructive font-medium">{errors.hourlyRate}</p>}
                    </div>
                </div>

                <div className="w-full h-px bg-border my-2" />

                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <BuildingStorefront className="h-5 w-5 text-primary" />
                        Teaching Environment
                    </h3>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold">Where will you tutor?</Label>
                        <Select value={values.teachingMode} onValueChange={(val) => handleChange('teachingMode', val)}>
                            <SelectTrigger className="h-12 rounded-xl border-input">
                                <SelectValue placeholder="Select teaching mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="online">Online Only</SelectItem>
                                <SelectItem value="in-person">In-Person Only</SelectItem>
                                <SelectItem value="hybrid">Both Online & In-Person</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.teachingMode && <p className="text-sm text-destructive font-medium">{errors.teachingMode}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <label className={`
                            relative flex items-center justify-between p-4 cursor-pointer rounded-xl border-2 transition-all
                            ${values.availabilityDays === 'weekdays' ? 'border-primary bg-primary/10' : 'border-border hover:border-accent-foreground/20 bg-background'}
                        `}>
                            <div className="flex items-center gap-3">
                                <div>
                                    <p className="font-bold text-sm text-foreground">Weekdays</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Mon - Fri</p>
                                </div>
                            </div>
                            <Checkbox
                                checked={values.availabilityDays === 'weekdays'}
                                onCheckedChange={() => handleChange('availabilityDays', 'weekdays')}
                                className="h-5 w-5 rounded-full border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                        </label>

                        <label className={`
                            relative flex items-center justify-between p-4 cursor-pointer rounded-xl border-2 transition-all
                            ${values.availabilityDays === 'weekends' ? 'border-primary bg-primary/10' : 'border-border hover:border-accent-foreground/20 bg-background'}
                        `}>
                            <div className="flex items-center gap-3">
                                <div>
                                    <p className="font-bold text-sm text-foreground">Weekends</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Sat - Sun</p>
                                </div>
                            </div>
                            <Checkbox
                                checked={values.availabilityDays === 'weekends'}
                                onCheckedChange={() => handleChange('availabilityDays', 'weekends')}
                                className="h-5 w-5 rounded-full border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                        </label>
                    </div>
                    {errors.availabilityDays && <p className="text-sm text-destructive font-medium">{errors.availabilityDays}</p>}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-border">
                    <Button type="button" variant="outline" size="lg" onClick={onBack} className="w-full sm:w-1/3 h-12 text-[15px] font-bold rounded-xl border-border shadow-sm">
                        Back
                    </Button>
                    <Button type="submit" size="lg" className="w-full sm:w-2/3 h-12 text-[15px] font-bold rounded-xl shadow-sm group">
                        Complete Profile
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </form>
        </div>
    )
}

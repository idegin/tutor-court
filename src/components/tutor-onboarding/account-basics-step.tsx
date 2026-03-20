"use client";
import React, { useState, useEffect, useRef } from 'react'
import { HiArrowRight as ArrowRight, HiUser as User } from 'react-icons/hi2'
import * as z from 'zod'
import { useAuth } from '@/components/providers/auth-provider'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'

import { SearchableSelect, getSelectClassNames } from '@/components/ui/searchable-select'
import { Country } from 'country-state-city'
import TimezoneSelect from 'react-timezone-select'
import PhoneInput, { isPossiblePhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

const accountBasicsSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    phoneNumber: z.any().refine((val: any) => typeof val === 'string' && isPossiblePhoneNumber(val), 'Valid phone number is required'),
    country: z.string().min(1, 'Country is required'),
    timezone: z.string().min(1, 'Timezone is required'),
    photo: z.any().refine((val: any) => val instanceof File, 'Profile photo is required'),
})

type AccountBasicsStepProps = {
    onNext: () => void
    onBack?: () => void
}

export function AccountBasicsStep({ onNext }: AccountBasicsStepProps) {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const [values, setValues] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        country: '',
        timezone: '',
        photo: null as File | null,
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const countries = Country.getAllCountries()

    const mutation = useMutation({
        mutationFn: async (data: FormData) => {
            const res = await fetch('/api/private/user', {
                method: 'PATCH',
                body: data,
            })
            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to update profile')
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] })
            onNext()
        },
        onError: (err: any) => {
            setErrors(prev => ({ ...prev, form: err.message }))
        }
    })

    useEffect(() => {
        if (user) {
            setValues((prev) => ({
                ...prev,
                firstName: prev.firstName || user.firstName || '',
                lastName: prev.lastName || user.lastName || '',
            }))
        }
    }, [user])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const result = accountBasicsSchema.safeParse(values)
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

        const formData = new FormData()
        formData.append('firstName', values.firstName)
        formData.append('lastName', values.lastName)
        formData.append('phoneNumber', values.phoneNumber)
        formData.append('country', values.country)
        formData.append('timezone', values.timezone)
        formData.append('isTutorOnboarding', 'true')
        if (values.photo) {
            formData.append('photo', values.photo)
        }

        mutation.mutate(formData)
    }

    const handleChange = (field: string, value: any) => {
        setValues((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }))
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleChange('photo', file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    return (
        <div className="flex flex-col max-w-xl w-full mx-auto md:ml-0 md:mr-auto justify-center">
            <style>
                {`
                  .PhoneInputInput {
                      appearance: none;
                      background-color: transparent;
                      border: none;
                      outline: none;
                      padding-left: 0.5rem;
                  }
                  .PhoneInputInput:focus {
                      outline: none;
                      border: none;
                  }
                `}
            </style>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-foreground">Step 1 of 3</span>
                <span className="text-sm font-semibold text-primary">33% Complete</span>
            </div>
            <Progress value={33} className="h-2 mb-6" />
            <span className="text-sm text-muted-foreground mb-4">Account Basics</span>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
                Welcome to TutorCourt
            </h1>
            <p className="text-[1.05rem] text-muted-foreground mb-8">
                Tell us a bit about yourself to get started.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="space-y-2">
                    <Label className="text-sm font-bold">Profile Photo <span className="text-destructive">*</span></Label>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`cursor-pointer border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${errors.photo ? 'border-destructive bg-destructive/10' : 'border-border hover:bg-muted'}`}
                    >
                        {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover mb-4 shadow-sm" />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                                <User className="h-8 w-8 text-muted-foreground" />
                            </div>
                        )}
                        <span className="font-bold text-[15px] mb-1">{photoPreview ? 'Change photo' : 'Upload photo'}</span>
                        <span className="text-xs text-muted-foreground">Recommended: JPG or PNG, max 2MB</span>
                        <input
                            type="file"
                            accept="image/jpeg, image/png"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                    </div>
                    {errors.photo && <p className="text-sm text-destructive font-medium">{errors.photo}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-bold">First Name <span className="text-destructive">*</span></Label>
                        <Input
                            placeholder="John"
                            className={`h-12 rounded-xl border ${errors.firstName ? 'border-destructive focus-visible:ring-destructive' : 'border-input'}`}
                            value={values.firstName}
                            onChange={(e) => handleChange('firstName', e.target.value)}
                        />
                        {errors.firstName && <p className="text-sm text-destructive font-medium">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-bold">Last Name <span className="text-destructive">*</span></Label>
                        <Input
                            placeholder="Doe"
                            className={`h-12 rounded-xl border ${errors.lastName ? 'border-destructive focus-visible:ring-destructive' : 'border-input'}`}
                            value={values.lastName}
                            onChange={(e) => handleChange('lastName', e.target.value)}
                        />
                        {errors.lastName && <p className="text-sm text-destructive font-medium">{errors.lastName}</p>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-bold">Phone Number <span className="text-destructive">*</span></Label>
                    <div className={`flex items-center h-12 w-full rounded-xl border bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${errors.phoneNumber ? 'border-destructive focus-within:ring-2 focus-within:ring-destructive' : 'border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'}`}>
                        <PhoneInput
                            placeholder="Enter phone number"
                            value={values.phoneNumber}
                            onChange={(val) => handleChange('phoneNumber', val)}
                            className="flex-1"
                        />
                    </div>
                    {errors.phoneNumber && <p className="text-sm text-destructive font-medium">{errors.phoneNumber}</p>}
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-bold">Country <span className="text-destructive">*</span></Label>
                    <SearchableSelect
                        options={countries.map(c => ({ value: c.isoCode, label: c.name }))}
                        value={countries.find(c => c.isoCode === values.country) ? { value: values.country, label: countries.find(c => c.isoCode === values.country)?.name } : null}
                        onChange={(val: any) => handleChange('country', val?.value || '')}
                        placeholder="Select country"
                        error={!!errors.country}
                    />
                    {errors.country && <p className="text-sm text-destructive font-medium">{errors.country}</p>}
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-bold">Timezone <span className="text-destructive">*</span></Label>
                    <TimezoneSelect
                        value={values.timezone}
                        onChange={(val: any) => handleChange('timezone', val.value)}
                        className="react-timezone-select"
                        unstyled
                        classNames={getSelectClassNames(!!errors.timezone)}
                    />
                    {errors.timezone && <p className="text-sm text-destructive font-medium">{errors.timezone}</p>}
                </div>

                {errors.form && <p className="text-sm text-destructive font-medium text-center">{errors.form}</p>}

                <Button type="submit" size="lg" className="w-full h-12 text-[15px] font-bold rounded-xl" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving...' : (
                        <>
                            Continue <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </form>
        </div >
    )
}

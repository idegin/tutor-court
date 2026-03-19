'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { AccountTypeSelection, AuthLayout, type AccountTypeOption } from '@/components/auth'

const NAV_LINKS = [
    { href: '/', label: 'Home' },
    { href: '#', label: 'About' },
    { href: '#', label: 'Find a Tutor' },
]

const ACCOUNT_TYPES: AccountTypeOption[] = [
    {
        id: 'tutor',
        title: 'Tutor',
        description: 'I want to share my knowledge and help students succeed.',
    },
    {
        id: 'parent-student',
        title: 'Parent or Student',
        description: 'I am looking for the right tutor to meet my learning goals.',
    },
]

export default function AccountTypePage() {
    const router = useRouter()
    const [selectedTypeId, setSelectedTypeId] = React.useState<string | undefined>(undefined)
    const [error, setError] = React.useState<string | undefined>(undefined)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const onSubmit = React.useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            if (!selectedTypeId) {
                setError('Please select an account type to continue.')
                return
            }

            setError(undefined)
            setIsSubmitting(true)
            setTimeout(() => {
                setIsSubmitting(false)
                router.push('/auth/verified-email')
            }, 300)
        },
        [router, selectedTypeId]
    )

    return (
        <AuthLayout
            variant="card"
            imagePosition="left"
            imageUrl="https://images.unsplash.com/photo-1571260899304-425dea4cf36e?q=80&w=2072&auto=format&fit=crop"
            heading="Choose your account type"
            subheading="Select the option that best describes you to get started with your personalized experience."
            panelTitle="Empowering the next generation"
            panelDescription="Join thousands of students who have found their perfect mentor on TutorCourt."
            navLinks={NAV_LINKS}
            primaryActionLabel="Log In"
            primaryActionHref="/auth/login"
        >
            <AccountTypeSelection
                options={ACCOUNT_TYPES}
                selectedTypeId={selectedTypeId}
                error={error}
                isSubmitting={isSubmitting}
                onSelect={(id) => {
                    setSelectedTypeId(id)
                    setError(undefined)
                }}
                onSubmit={onSubmit}
                onLoginClick={() => router.push('/auth/login')}
            />
        </AuthLayout>
    )
}

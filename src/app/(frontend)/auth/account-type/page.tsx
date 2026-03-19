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
        id: 'parent',
        title: 'Parent',
        description: 'I am looking for the right tutor to meet my child\'s learning goals.',
    },
    {
        id: 'student',
        title: 'Student',
        description: 'I am looking for the right tutor to meet my learning goals.',
    },
]

export default function AccountTypePage() {
    const router = useRouter()
    const [selectedTypeId, setSelectedTypeId] = React.useState<string | undefined>(undefined)
    const [error, setError] = React.useState<string | undefined>(undefined)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const onSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            if (!selectedTypeId) {
                setError('Please select an account type to continue.')
                return
            }

            setError(undefined)
            setIsSubmitting(true)

            try {
                const storedDataStr = sessionStorage.getItem('registrationData')
                if (!storedDataStr) {
                    setError('Missing registration data. Please go back and try again.')
                    setIsSubmitting(false)
                    return
                }

                const storedData = JSON.parse(storedDataStr)

                // Map 'parent-student' to either 'parent' or 'student' if needed? 
                // Wait, users schema allows 'parent' or 'student' or 'tutor'.
                // The UI only has two options: 'tutor' | 'parent-student'. We can save it as 'student' or 'parent'. Let's default to 'student' if parent-student is chosen.
                // Or maybe let's fix the schema to allow 'parent-student' or just map 'parent-student' to 'student'.
                const accountType = selectedTypeId

                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstName: storedData.firstName,
                        lastName: storedData.lastName,
                        email: storedData.email,
                        password: storedData.password,
                        accountType,
                    }),
                })

                if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.errors?.[0]?.message || 'Failed to create account. Please try again.')
                }

                // Need to log in the user right after? The user might wait for verification if `auth: { verify: true }`.
                sessionStorage.removeItem('registrationData')
                router.push('/auth/verified-email')
            } catch (err: any) {
                setError(err.message)
                setIsSubmitting(false)
            }
        },
        [router, selectedTypeId]
    )

    return (
        <AuthLayout
            imageUrl="https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=2070&auto=format&fit=crop"
            heading="Choose your account type"
            subheading="Select the option that best describes you to get started with your personalized experience."
            panelTitle="Your path to success starts here"
            panelDescription="Whether you're looking to learn or teach, we have the right tools to support your goals."
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

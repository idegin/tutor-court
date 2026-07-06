'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import * as React from 'react'
import { toast } from 'sonner'

import {
    AccountTypeSelection,
    AuthLayout,
    RegisterForm,
    type AccountTypeOption,
    type RegisterField,
    type RegisterValues,
    validateRegister,
} from '@/components/auth'

const NAV_LINKS: any[] = [

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

const INITIAL_VALUES: RegisterValues = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    agreeToTerms: false,
}

function RegisterContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const emailParam = searchParams.get('email')
    const roleParam = searchParams.get('role')
    const tokenParam = searchParams.get('token')

    const [step, setStep] = React.useState<1 | 2>(1)
    const [selectedTypeId, setSelectedTypeId] = React.useState<string | undefined>(undefined)
    const [values, setValues] = React.useState<RegisterValues>(INITIAL_VALUES)
    const [errors, setErrors] = React.useState<ReturnType<typeof validateRegister>>({})
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    React.useEffect(() => {
        if (emailParam) {
            setValues(prev => ({ ...prev, email: emailParam }))
        }
        if (roleParam && ['tutor', 'parent', 'student'].includes(roleParam)) {
            setSelectedTypeId(roleParam)
            setStep(2)
        }
        // Preserve the class invite so the user resumes acceptance after
        // verifying their email and logging in (the register POST drops it).
        if (tokenParam && typeof window !== 'undefined') {
            localStorage.setItem('post_login_redirect', `/class-invite/${tokenParam}`)
        }
    }, [emailParam, roleParam, tokenParam])

    const mutation = useMutation({
        mutationFn: async (vars: any) => {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vars),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.errors?.[0]?.message || 'Request failed')
            }
            return res.json()
        },
        onMutate: () => setIsSubmitting(true),
        onSettled: () => setIsSubmitting(false),
        onSuccess: () => {
            router.push('/auth/check-email')
        },
        onError: (err: any) => {
            setErrors({ form: err.message })
        }
    })


    const onAccountTypeSelect = React.useCallback((id: string) => {
        setSelectedTypeId(id)
        setStep(2)
    }, [])

    const onChange = React.useCallback(
        (field: RegisterField, value: string | boolean) => {
            setValues((prev) => ({ ...prev, [field]: value }))
            setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
        },
        []
    )

    const onSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const nextErrors = validateRegister(values)
            setErrors(nextErrors)

            if (Object.keys(nextErrors).length > 0) {
                return
            }

            if (!selectedTypeId) {
                toast.error('Please go back and select an account type.', { position: 'top-center' })
                return
            }

            setIsSubmitting(true)

            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstName: values.firstName,
                        lastName: values.lastName,
                        email: values.email,
                        phoneNumber: values.phoneNumber,
                        password: values.password,
                        accountType: selectedTypeId,
                    }),
                })

                if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.errors?.[0]?.message || 'Failed to create account. Please try again.')
                }

                router.push(`/auth/check-email?email=${encodeURIComponent(values.email)}`)
            } catch (err: any) {
                const raw = err.message || ''
                const message = raw.toLowerCase().includes('invalid: email')
                    ? 'This email is already registered. Please log in or use a different email.'
                    : raw || 'Failed to create account. Please try again.'
                toast.error(message, { position: 'top-center' })
                setIsSubmitting(false)
            }
        },
        [router, values, selectedTypeId]
    )

    return (
        <AuthLayout
            imageUrl="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop"
            heading={step === 1 ? "Choose your account type" : "Create Your Account"}
            subheading={step === 1 ? "Select the option that best describes you to get started." : "Join our growing community."}
            panelTitle="A platform built for excellence"
            panelDescription="Connect with top-tier tutors or discover students eager to learn."
            navLinks={NAV_LINKS}
            primaryActionLabel="Log In"
            primaryActionHref="/auth/login"
        >
            {step === 1 ? (
                <AccountTypeSelection
                    options={ACCOUNT_TYPES}
                    selectedTypeId={selectedTypeId}
                    onSelect={onAccountTypeSelect}
                    onLoginClick={() => router.push('/auth/login')}
                />
            ) : (
                <div className="space-y-6">
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-sm font-semibold text-tutor-purple-600 dark:text-tutor-purple-400 hover:underline"
                    >
                        ← Back to account type
                    </button>
                    <RegisterForm
                        values={values}
                        errors={errors}
                        isSubmitting={isSubmitting}
                        onChange={onChange}
                        onSubmit={onSubmit}
                        onLoginClick={() => router.push('/auth/login')}
                    />
                </div>
            )}
        </AuthLayout>
    )
}

export default function RegisterPage() {
    return (
        <React.Suspense fallback={
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tutor-purple-600" />
            </div>
        }>
            <RegisterContent />
        </React.Suspense>
    )
}

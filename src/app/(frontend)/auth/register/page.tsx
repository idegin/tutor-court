'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
    AuthLayout,
    RegisterForm,
    type RegisterField,
    type RegisterValues,
    validateRegister,
} from '@/components/auth'

const NAV_LINKS = [
    { href: '/', label: 'Home' },
    { href: '#', label: 'About' },
    { href: '#', label: 'Find a Tutor' },
]

const INITIAL_VALUES: RegisterValues = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    agreeToTerms: false,
}

export default function RegisterPage() {
    const router = useRouter()
    const [values, setValues] = React.useState<RegisterValues>(INITIAL_VALUES)
    const [errors, setErrors] = React.useState<ReturnType<typeof validateRegister>>({})
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const onChange = React.useCallback(
        (field: RegisterField, value: string | boolean) => {
            setValues((prev) => ({ ...prev, [field]: value }))
            setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
        },
        []
    )

    const onSubmit = React.useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const nextErrors = validateRegister(values)
            setErrors(nextErrors)

            if (Object.keys(nextErrors).length > 0) {
                return
            }

            setIsSubmitting(true)
            setTimeout(() => {
                setIsSubmitting(false)
                router.push('/auth/account-type')
            }, 300)
        },
        [router, values]
    )

    return (
        <AuthLayout
            variant="card"
            imagePosition="left"
            imageUrl="https://images.unsplash.com/photo-1571260899304-425dea4cf36e?q=80&w=2072&auto=format&fit=crop"
            heading="Create Your Account"
            subheading="Join our growing community of parents and tutors to start your learning journey today."
            panelTitle="Empowering the next generation"
            panelDescription="Join thousands of students who have found their perfect mentor on TutorCourt."
            navLinks={NAV_LINKS}
            primaryActionLabel="Log In"
            primaryActionHref="/auth/login"
        >
            <RegisterForm
                values={values}
                errors={errors}
                isSubmitting={isSubmitting}
                onChange={onChange}
                onSubmit={onSubmit}
                onLoginClick={() => router.push('/auth/login')}
            />
        </AuthLayout>
    )
}

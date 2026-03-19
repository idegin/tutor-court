'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
    AuthLayout,
    ResetPasswordForm,
    type ResetPasswordField,
    type ResetPasswordValues,
    validateResetPassword,
} from '@/components/auth'

const NAV_LINKS = [{ href: '#', label: 'Help' }]

const INITIAL_VALUES: ResetPasswordValues = {
    email: '',
}

export default function ResetPasswordPage() {
    const router = useRouter()
    const [values, setValues] = React.useState<ResetPasswordValues>(INITIAL_VALUES)
    const [errors, setErrors] = React.useState<ReturnType<typeof validateResetPassword>>({})
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const onChange = React.useCallback((field: ResetPasswordField, value: string) => {
        setValues((prev) => ({ ...prev, [field]: value }))
        setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
    }, [])

    const onSubmit = React.useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const nextErrors = validateResetPassword(values)
            setErrors(nextErrors)

            if (Object.keys(nextErrors).length > 0) {
                return
            }

            setIsSubmitting(true)
            setTimeout(() => {
                setIsSubmitting(false)
                router.push('/auth/update-password')
            }, 300)
        },
        [router, values]
    )

    return (
        <AuthLayout
            variant="card"
            imagePosition="right"
            imageUrl="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
            heading="Forgot Password?"
            subheading="Don't worry, it happens. Enter your email address below and we'll send you a link to reset your password."
            panelTitle="Unlock your potential."
            panelDescription="Access world-class tutoring and educational resources with TutorCourt."
            navLinks={NAV_LINKS}
            primaryActionLabel="Log In"
            primaryActionHref="/auth/login"
        >
            <ResetPasswordForm
                values={values}
                errors={errors}
                isSubmitting={isSubmitting}
                onChange={onChange}
                onSubmit={onSubmit}
                onBackToLoginClick={() => router.push('/auth/login')}
            />
        </AuthLayout>
    )
}

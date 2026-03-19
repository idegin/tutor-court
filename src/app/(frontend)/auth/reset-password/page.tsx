'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
    AuthLayout,
    CheckEmailCard,
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
    const [isSuccess, setIsSuccess] = React.useState(false)

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
            fetch('/api/users/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: values.email }),
            }).then(async (res) => {
                if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.message || data.errors?.[0]?.message || 'Error sending reset email.')
                }
                setIsSubmitting(false)
                setIsSuccess(true)
            }).catch((err) => {
                setIsSubmitting(false)
                setErrors({ form: err.message })
            })
        },
        [values]
    )

    return (
        <AuthLayout
            imageUrl="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070&auto=format&fit=crop"
            heading={isSuccess ? "Check your email" : "Forgot Password?"}
            subheading={isSuccess ? "We've sent a link to reset your password if that account exists." : "Don't worry, it happens. Enter your email address below and we'll send you a link to reset your password."}
            panelTitle="Stay focused on what matters"
            panelDescription="Let us help you get back to learning without any interruptions."
            navLinks={NAV_LINKS}
            primaryActionLabel="Log In"
            primaryActionHref="/auth/login"
        >
            {isSuccess ? (
                <CheckEmailCard
                    title="Check your inbox"
                    description="If an account exists for that email, we have sent a password reset link. Please check your inbox and spam folder."
                    ctaLabel="Back to Login"
                    onContinueClick={() => router.push('/auth/login')} onResendClick={() => {
                        fetch('/api/users/forgot-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: values.email }),
                        }).catch(() => { })
                    }} />
            ) : (
                <ResetPasswordForm
                    values={values}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    onChange={onChange}
                    onSubmit={onSubmit}
                    onBackToLoginClick={() => router.push('/auth/login')}
                />
            )}
        </AuthLayout>
    )
}

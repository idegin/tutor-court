'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import {
    AuthLayout,
    type UpdatePasswordField,
    type UpdatePasswordValues,
    UpdatePasswordForm,
    validateUpdatePassword,
} from '@/components/auth'

const NAV_LINKS = [{ href: '#', label: 'Help' }]

const INITIAL_VALUES: UpdatePasswordValues = {
    newPassword: '',
    confirmNewPassword: '',
}

function UpdatePasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const [values, setValues] = React.useState<UpdatePasswordValues>(INITIAL_VALUES)
    const [errors, setErrors] = React.useState<ReturnType<typeof validateUpdatePassword>>({})
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const onChange = React.useCallback((field: UpdatePasswordField, value: string) => {
        setValues((prev) => ({ ...prev, [field]: value }))
        setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
    }, [])

    const onSubmit = React.useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const nextErrors = validateUpdatePassword(values)
            setErrors(nextErrors)

            if (Object.keys(nextErrors).length > 0) {
                return
            }

            setIsSubmitting(true)
            if (!token) {
                setErrors({ form: 'No reset token found in URL.' })
                setIsSubmitting(false)
                return
            }
            fetch('/api/users/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: values.newPassword }),
            }).then(async (res) => {
                if (!res.ok) {
                    const data = await res.json()
                    throw new Error(data.message || 'Error resetting password.')
                }
                setIsSubmitting(false)
                alert('Password reset successfully!')
                router.push('/auth/login')
            }).catch((err) => {
                setIsSubmitting(false)
                setErrors({ form: err.message })
            })
        },
        [router, values]
    )

    return (
        <AuthLayout
            imageUrl="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=2073&auto=format&fit=crop"
            heading="Reset Password"
            subheading="Choose a new password for your account to regain access to your dashboard."
            navLinks={NAV_LINKS}
            primaryActionLabel="Log In"
            primaryActionHref="/auth/login"
            panelTitle="A secure environment for growth"
            panelDescription="Maintain a strong password to keep your progress and learning materials private."
            panelContent={
                <div className="flex gap-2 justify-center mt-8 pb-4">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="w-2 h-2 rounded-full bg-primary/20" />
                    <div className="w-2 h-2 rounded-full bg-primary/20" />
                </div>
            }
        >
            <UpdatePasswordForm
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


export default function UpdatePasswordPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <UpdatePasswordContent />
        </React.Suspense>
    )
}


export default function UpdatePasswordPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <UpdatePasswordContent />
        </React.Suspense>
    )
}

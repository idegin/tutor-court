'use client'

import { useRouter } from 'next/navigation'
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

export default function UpdatePasswordPage() {
    const router = useRouter()
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
            setTimeout(() => {
                setIsSubmitting(false)
                router.push('/auth/login')
            }, 300)
        },
        [router, values]
    )

    return (
        <AuthLayout
            variant="card"
            imagePosition="right"
            imageUrl="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop"
            heading="Reset Password"
            subheading="Choose a new password for your account to regain access to your dashboard."
            navLinks={NAV_LINKS}
            primaryActionLabel="Log In"
            primaryActionHref="/auth/login"
            panelContent={
                <div className="absolute inset-0 flex flex-col items-center justify-end p-10 bg-gradient-to-t from-[#f0fff4] via-transparent to-transparent text-center">
                    <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl w-[95%] shadow-xl mb-4 border border-white">
                        <h2 className="text-xl font-bold text-[#1A1F26]">Secure Learning Environment</h2>
                        <p className="mt-3 text-[#1A1F26]/70 leading-relaxed text-sm">
                            TutorCourt provides a safe space for educators and students to connect. Keep your account secure with a strong password.
                        </p>
                        <div className="flex gap-2 justify-center mt-6">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <div className="w-2 h-2 rounded-full bg-primary/20" />
                            <div className="w-2 h-2 rounded-full bg-primary/20" />
                        </div>
                    </div>
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

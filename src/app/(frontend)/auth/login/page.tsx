'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
    AuthLayout,
    LoginForm,
    type LoginField,
    type LoginValues,
    validateLogin,
} from '@/components/auth'

const NAV_LINKS = [
    { href: '/', label: 'Home' },
    { href: '#', label: 'About' },
    { href: '#', label: 'Find a Tutor' },
]

const INITIAL_VALUES: LoginValues = {
    email: '',
    password: '',
    rememberMe: false,
}

export default function LoginPage() {
    const router = useRouter()
    const [values, setValues] = React.useState<LoginValues>(INITIAL_VALUES)
    const [errors, setErrors] = React.useState<ReturnType<typeof validateLogin>>({})
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const onChange = React.useCallback(
        (field: LoginField, value: string | boolean) => {
            setValues((prev) => ({ ...prev, [field]: value }))
            setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
        },
        []
    )

    const onSubmit = React.useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const nextErrors = validateLogin(values)
            setErrors(nextErrors)

            if (Object.keys(nextErrors).length > 0) {
                return
            }

            setIsSubmitting(true)
            setTimeout(() => {
                setIsSubmitting(false)
                router.push('/auth/verified-email')
            }, 300)
        },
        [router, values]
    )

    return (
        <AuthLayout
            heading="Welcome Back"
            subheading="Please enter your details to sign in and continue your learning journey."
            panelTitle="The best way to predict the future is to create it through learning."
            panelDescription="The TutorCourt Team"
            navLinks={NAV_LINKS}
            primaryActionLabel="Log In"
            primaryActionHref="/auth/login"
        >
            <LoginForm
                values={values}
                errors={errors}
                isSubmitting={isSubmitting}
                onChange={onChange}
                onSubmit={onSubmit}
                onForgotPasswordClick={() => router.push('/auth/reset-password')}
                onCreateAccountClick={() => router.push('/auth/register')}
            />
        </AuthLayout>
    )
}

'use client'

import { useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import * as React from 'react'
import { Suspense } from 'react'
import { toast } from 'sonner'

import {
    AuthLayout,
    LoginForm,
    type LoginField,
    type LoginValues,
    validateLogin,
} from '@/components/auth'
import { useRouter } from 'next13-progressbar'

const NAV_LINKS: any[] = [

]

const INITIAL_VALUES: LoginValues = {
    email: '',
    password: '',
    rememberMe: false,
}

function LoginContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectUrl = searchParams.get('redirect') || '/'

    const [values, setValues] = React.useState<LoginValues>(INITIAL_VALUES)
    const [errors, setErrors] = React.useState<ReturnType<typeof validateLogin>>({})
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const mutation = useMutation({
        mutationFn: async (vars: any) => {
            const res = await fetch('/api/users/login', {
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
        onSuccess: (data) => {
            const redirectParam = searchParams.get('redirect')
            const localRedirect = typeof window !== 'undefined' ? localStorage.getItem('post_login_redirect') : null

            if (localRedirect) {
                localStorage.removeItem('post_login_redirect')
                router.push(localRedirect)
                router.refresh()
            } else if (redirectParam) {
                router.push(redirectParam)
                router.refresh()
            } else {
                const accountType = data?.user?.accountType;
                if (accountType) {
                    window.location.href = `/dashboard/${accountType}`
                } else {
                    window.location.reload()
                }
            }
        },
        onError: (err: any) => {
            if (err.message === 'The email or password provided is incorrect.') {
                toast.error(err.message, {
                    description: 'Please check your credentials and try again.',
                    position: 'top-center',
                })
            } else {
                toast.error(err.message || 'An error occurred during log in', { position: 'top-center' })
            }
        }
    })


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

            mutation.mutate({ email: values.email, password: values.password })
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

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LoginContent />
        </Suspense>
    )
}

import * as React from 'react'
import { HiEnvelope, HiLockClosed, HiEye, HiEyeSlash } from 'react-icons/hi2'
import { FiArrowRight } from 'react-icons/fi'

import type { FieldErrors, LoginField, LoginValues } from '@/components/auth/auth-types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
    FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type LoginFormProps = {
    values: LoginValues
    errors?: FieldErrors<LoginField>
    isSubmitting?: boolean
    onChange: (field: LoginField, value: string | boolean) => void
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
    onForgotPasswordClick?: () => void
    onCreateAccountClick?: () => void
}

export function LoginForm({
    values,
    errors,
    isSubmitting = false,
    onChange,
    onSubmit,
    onForgotPasswordClick,
    onCreateAccountClick,
}: LoginFormProps) {
    const [showPassword, setShowPassword] = React.useState(false)
    const hasError = Boolean(errors?.email || errors?.password)

    return (
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
            <Field data-invalid={Boolean(errors?.email)} className="gap-2">
                <FieldLabel htmlFor="login-email" className="font-bold text-foreground">Email Address</FieldLabel>
                <FieldContent>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <HiEnvelope className="h-5 w-5 text-muted-foreground/70" />
                        </div>
                        <Input
                            id="login-email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            autoCapitalize="none"
                            spellCheck={false}
                            maxLength={120}
                            value={values.email}
                            onChange={(event) => onChange('email', event.target.value)}
                            aria-invalid={Boolean(errors?.email)}
                            placeholder="name@example.com"
                            className="bg-transparent pl-11 h-12 rounded-xl text-base border-border/80 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                        />
                    </div>
                    <FieldError>{errors?.email}</FieldError>
                </FieldContent>
            </Field>

            <Field data-invalid={Boolean(errors?.password)} className="gap-2">
                <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="login-password" className="font-bold text-foreground">Password</FieldLabel>
                    <button
                        type="button"
                        onClick={onForgotPasswordClick}
                        className="text-sm font-semibold text-primary hover:underline"
                    >
                        Forgot password?
                    </button>
                </div>
                <FieldContent>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <HiLockClosed className="h-5 w-5 text-muted-foreground/70" />
                        </div>
                        <Input
                            id="login-password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            maxLength={128}
                            value={values.password}
                            onChange={(event) => onChange('password', event.target.value)}
                            aria-invalid={Boolean(errors?.password)}
                            placeholder="Enter your password"
                            className="bg-transparent pl-11 pr-11 h-12 rounded-xl text-base border-border/80 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground/70 hover:text-foreground transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? (
                                <HiEyeSlash className="h-5 w-5" />
                            ) : (
                                <HiEye className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                    <FieldError>{errors?.password}</FieldError>
                </FieldContent>
            </Field>

            <Field orientation="horizontal" className="items-center justify-start gap-3 mt-4">
                <Checkbox
                    id="remember-me"
                    checked={values.rememberMe}
                    onCheckedChange={(checked) => onChange('rememberMe', checked === true)}
                    className="h-5 w-5 rounded-md border-border/80 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary"
                />
                <FieldLabel htmlFor="remember-me" className="text-sm font-medium text-muted-foreground cursor-pointer">
                    Remember me for 30 days
                </FieldLabel>
            </Field>

            <div className="pt-2">
                <Button type="submit" size="lg" className="w-full h-12 text-[15px] rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                    {!isSubmitting && (
                        <FiArrowRight className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {errors?.form ? <p className="text-sm text-destructive">{errors.form}</p> : null}
            {hasError ? (
                <FieldDescription>Please fix the highlighted fields before submitting.</FieldDescription>
            ) : null}

            <p className="text-center text-sm text-muted-foreground pt-4">
                Don't have an account?{' '}
                <button type="button" className="font-bold text-primary hover:underline ml-1" onClick={onCreateAccountClick}>
                    Create an account
                </button>
            </p>
        </form>
    )
}

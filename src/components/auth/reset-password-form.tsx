import * as React from 'react'
import { HiEnvelope } from 'react-icons/hi2'
import { FiArrowLeft } from 'react-icons/fi'

import type {
    FieldErrors,
    ResetPasswordField,
    ResetPasswordValues,
} from '@/components/auth/auth-types'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type ResetPasswordFormProps = {
    values: ResetPasswordValues
    errors?: FieldErrors<ResetPasswordField>
    isSubmitting?: boolean
    onChange: (field: ResetPasswordField, value: string) => void
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
    onBackToLoginClick?: () => void
}

export function ResetPasswordForm({
    values,
    errors,
    isSubmitting = false,
    onChange,
    onSubmit,
    onBackToLoginClick,
}: ResetPasswordFormProps) {
    return (
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
            <Field data-invalid={Boolean(errors?.email)} className="gap-2">
                <FieldLabel htmlFor="reset-email" className="font-bold text-foreground">Email Address</FieldLabel>
                <FieldContent>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <HiEnvelope className="h-5 w-5 text-muted-foreground/70" />
                        </div>
                        <Input
                            id="reset-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            spellCheck={false}
                            maxLength={120}
                            value={values.email}
                            onChange={(event) => onChange('email', event.target.value)}
                            aria-invalid={Boolean(errors?.email)}
                            placeholder="example@email.com"
                            className="bg-transparent pl-11 h-12 rounded-xl text-base border-border/80 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                        />
                    </div>
                    <FieldError>{errors?.email}</FieldError>
                </FieldContent>
            </Field>

            <div className="pt-2">
                <Button type="submit" size="lg" className="w-full h-12 text-[15px] rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
            </div>

            {errors?.form ? <p className="text-sm text-center text-destructive font-medium">{errors.form}</p> : null}

            <div className="pt-2 text-center text-sm font-medium">
                <button type="button" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors" onClick={onBackToLoginClick}>
                    <FiArrowLeft className="h-4 w-4" />
                    Back to Login
                </button>
            </div>
        </form>
    )
}

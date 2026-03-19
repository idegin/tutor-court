import * as React from 'react'
import { HiLockClosed, HiEye, HiEyeSlash } from 'react-icons/hi2'
import { FiArrowLeft } from 'react-icons/fi'

import type {
    FieldErrors,
    UpdatePasswordField,
    UpdatePasswordValues,
} from '@/components/auth/auth-types'
import { PASSWORD_POLICY_TEXT } from '@/components/auth/auth-validation'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type UpdatePasswordFormProps = {
    values: UpdatePasswordValues
    errors?: FieldErrors<UpdatePasswordField>
    isSubmitting?: boolean
    onChange: (field: UpdatePasswordField, value: string) => void
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
    onBackToLoginClick?: () => void
}

export function UpdatePasswordForm({
    values,
    errors,
    isSubmitting = false,
    onChange,
    onSubmit,
    onBackToLoginClick,
}: UpdatePasswordFormProps) {
    const [showNewPassword, setShowNewPassword] = React.useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

    return (
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
            <Field data-invalid={Boolean(errors?.newPassword)} className="gap-2">
                <FieldLabel htmlFor="new-password" className="font-bold text-foreground">New Password</FieldLabel>
                <FieldContent>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <HiLockClosed className="h-5 w-5 text-muted-foreground/70" />
                        </div>
                        <Input
                            id="new-password"
                            name="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            maxLength={128}
                            value={values.newPassword}
                            onChange={(event) => onChange('newPassword', event.target.value)}
                            aria-invalid={Boolean(errors?.newPassword)}
                            placeholder="Enter new password"
                            className="bg-transparent pl-11 pr-11 h-12 rounded-xl text-base border-border/80 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground/70 hover:text-foreground transition-colors"
                            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                            {showNewPassword ? (
                                <HiEyeSlash className="h-5 w-5" />
                            ) : (
                                <HiEye className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                    {!errors?.newPassword ? (
                        <FieldDescription className="text-xs text-muted-foreground mt-1.5">{PASSWORD_POLICY_TEXT}</FieldDescription>
                    ) : null}
                    <FieldError>{errors?.newPassword}</FieldError>
                </FieldContent>
            </Field>

            <Field data-invalid={Boolean(errors?.confirmNewPassword)} className="gap-2">
                <FieldLabel htmlFor="confirm-new-password" className="font-bold text-foreground">Confirm New Password</FieldLabel>
                <FieldContent>
                     <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <HiLockClosed className="h-5 w-5 text-muted-foreground/70" />
                        </div>
                        <Input
                            id="confirm-new-password"
                            name="confirmNewPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            maxLength={128}
                            value={values.confirmNewPassword}
                            onChange={(event) => onChange('confirmNewPassword', event.target.value)}
                            aria-invalid={Boolean(errors?.confirmNewPassword)}
                            placeholder="Re-enter new password"
                            className="bg-transparent pl-11 pr-11 h-12 rounded-xl text-base border-border/80 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground/70 hover:text-foreground transition-colors"
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                            {showConfirmPassword ? (
                                <HiEyeSlash className="h-5 w-5" />
                            ) : (
                                <HiEye className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                    <FieldError>{errors?.confirmNewPassword}</FieldError>
                </FieldContent>
            </Field>

            <div className="pt-2">
                <Button type="submit" size="lg" className="w-full h-12 text-[15px] rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2" disabled={isSubmitting}>
                    {isSubmitting ? 'Updating password...' : 'Update Password'}
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

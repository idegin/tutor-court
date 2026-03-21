import * as React from 'react'
import { HiUser, HiEnvelope, HiLockClosed, HiEye, HiEyeSlash } from 'react-icons/hi2'
import { FiArrowRight } from 'react-icons/fi'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

import type {
    FieldErrors,
    RegisterField,
    RegisterValues,
} from '@/components/auth/auth-types'
import { PASSWORD_POLICY_TEXT } from '@/components/auth/auth-validation'
import { Button } from '@/components/ui/button'

import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type RegisterFormProps = {
    values: RegisterValues
    errors?: FieldErrors<RegisterField>
    isSubmitting?: boolean
    onChange: (field: RegisterField, value: string | boolean) => void
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
    onLoginClick?: () => void
}

export function RegisterForm({
    values,
    errors,
    isSubmitting = false,
    onChange,
    onSubmit,
    onLoginClick,
}: RegisterFormProps) {
    const [showPassword, setShowPassword] = React.useState(false)

    return (
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
            <style>
                {`
                  .PhoneInputInput {
                      appearance: none;
                      background-color: transparent;
                      border: none;
                      outline: none;
                      padding-left: 0.5rem;
                      width: 100%;
                  }
                  .PhoneInputInput:focus {
                      outline: none;
                      border: none;
                  }
                `}
            </style>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors?.firstName)} className="gap-2">
                    <FieldLabel htmlFor="register-first-name" className="font-bold text-foreground">First Name</FieldLabel>
                    <FieldContent>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                <HiUser className="h-5 w-5 text-muted-foreground/70" />
                            </div>
                            <Input
                                id="register-first-name"
                                name="firstName"
                                autoComplete="given-name"
                                maxLength={80}
                                value={values.firstName}
                                onChange={(event) => onChange('firstName', event.target.value)}
                                aria-invalid={Boolean(errors?.firstName)}
                                placeholder="Jane"
                                className="bg-transparent pl-11 h-12 rounded-xl text-base border-border/80 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                            />
                        </div>
                        <FieldError>{errors?.firstName}</FieldError>
                    </FieldContent>
                </Field>

                <Field data-invalid={Boolean(errors?.lastName)} className="gap-2">
                    <FieldLabel htmlFor="register-last-name" className="font-bold text-foreground">Last Name</FieldLabel>
                    <FieldContent>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                <HiUser className="h-5 w-5 text-muted-foreground/70" />
                            </div>
                            <Input
                                id="register-last-name"
                                name="lastName"
                                autoComplete="family-name"
                                maxLength={80}
                                value={values.lastName}
                                onChange={(event) => onChange('lastName', event.target.value)}
                                aria-invalid={Boolean(errors?.lastName)}
                                placeholder="Doe"
                                className="bg-transparent pl-11 h-12 rounded-xl text-base border-border/80 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                            />
                        </div>
                        <FieldError>{errors?.lastName}</FieldError>
                    </FieldContent>
                </Field>
            </div>

            <Field data-invalid={Boolean(errors?.email)} className="gap-2">
                <FieldLabel htmlFor="register-email" className="font-bold text-foreground">Email Address</FieldLabel>
                <FieldContent>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <HiEnvelope className="h-5 w-5 text-muted-foreground/70" />
                        </div>
                        <Input
                            id="register-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            spellCheck={false}
                            maxLength={120}
                            value={values.email}
                            onChange={(event) => onChange('email', event.target.value)}
                            aria-invalid={Boolean(errors?.email)}
                            placeholder="jane.doe@example.com"
                            className="bg-transparent pl-11 h-12 rounded-xl text-base border-border/80 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                        />
                    </div>
                    <FieldError>{errors?.email}</FieldError>
                </FieldContent>
            </Field>

            <Field data-invalid={Boolean(errors?.phoneNumber)} className="gap-2">
                <FieldLabel htmlFor="register-phone" className="font-bold text-foreground">Phone Number</FieldLabel>
                <FieldContent>
                    <div className="relative">
                        <div className={`flex items-center h-12 w-full rounded-xl border bg-transparent px-3 py-2 text-base ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${errors?.phoneNumber ? 'border-destructive focus-within:ring-2 focus-within:ring-destructive' : 'border-border/80 focus-within:ring-2 focus-within:ring-primary/50'}`}>
                            <PhoneInput
                                id="register-phone"
                                name="phoneNumber"
                                placeholder="Enter phone number"
                                value={values.phoneNumber || ''}
                                onChange={(val) => onChange('phoneNumber', val || '')}
                                className="flex-1 PhoneInput-custom"
                                style={{
                                    '--PhoneInput-color--focus': 'hsl(var(--primary))',
                                    '--PhoneInputInternationalIconPhone-opacity': '0.8',
                                } as React.CSSProperties}
                            />
                        </div>
                    </div>
                    <FieldError>{errors?.phoneNumber}</FieldError>
                </FieldContent>
            </Field>

            <Field data-invalid={Boolean(errors?.password)} className="gap-2">
                <FieldLabel htmlFor="register-password" className="font-bold text-foreground">Password</FieldLabel>
                <FieldContent>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <HiLockClosed className="h-5 w-5 text-muted-foreground/70" />
                        </div>
                        <Input
                            id="register-password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            maxLength={128}
                            value={values.password}
                            onChange={(event) => onChange('password', event.target.value)}
                            aria-invalid={Boolean(errors?.password)}
                            placeholder="Min. 8 characters"
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
                    {/* Only show default description if there's no error */}
                    {!errors?.password ? (
                        <FieldDescription className="text-xs text-muted-foreground mt-1.5">{PASSWORD_POLICY_TEXT}</FieldDescription>
                    ) : null}
                    <FieldError>{errors?.password}</FieldError>
                </FieldContent>
            </Field>

            <div className="pt-2 pb-1">
                <Button type="submit" size="lg" className="w-full h-12 text-[15px] rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating account...' : 'Create My Account'}
                    {!isSubmitting && (
                        <FiArrowRight className="h-5 w-5" />
                    )}
                </Button>
            </div>

            <div className="text-center text-[13px] text-muted-foreground leading-relaxed">
                By signing up, you agree to our <a href="#" className="text-primary hover:underline transition-colors">Terms of Service</a> and <a href="#" className="text-primary hover:underline transition-colors">Privacy Policy</a>.
            </div>

            {errors?.form ? <p className="text-sm text-center text-destructive font-medium">{errors.form}</p> : null}

            <div className="pt-4 border-t border-border/50 text-center">
                <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button type="button" className="font-bold text-primary hover:underline ml-1" onClick={onLoginClick}>
                        Log In
                    </button>
                </p>
            </div>
        </form>
    )
}

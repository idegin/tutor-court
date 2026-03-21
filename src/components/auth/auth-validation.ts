import type {
  FieldErrors,
  LoginField,
  LoginValues,
  RegisterField,
  RegisterValues,
  ResetPasswordField,
  ResetPasswordValues,
  UpdatePasswordField,
  UpdatePasswordValues,
} from '@/components/auth/auth-types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/

import { isPossiblePhoneNumber } from 'react-phone-number-input'

export const PASSWORD_POLICY_TEXT =
  'Use 8 to 128 characters with uppercase, lowercase, number, and symbol.'

export function sanitizeText(value: string): string {
  return value.trim().replace(/\s{2,}/g, ' ')
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(normalizeEmail(value))
}

export function isStrongPassword(value: string): boolean {
  return PASSWORD_POLICY_REGEX.test(value)
}

export function validateLogin(values: LoginValues): FieldErrors<LoginField> {
  const errors: FieldErrors<LoginField> = {}

  if (!values.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.password) {
    errors.password = 'Password is required.'
  }

  return errors
}

export function validateRegister(
  values: RegisterValues
): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {}

  if (!values.firstName.trim()) {
    errors.firstName = 'First name is required.'
  } else if (sanitizeText(values.firstName).length < 2) {
    errors.firstName = 'First name must be at least 2 characters.'
  }

  if (!values.lastName.trim()) {
    errors.lastName = 'Last name is required.'
  } else if (sanitizeText(values.lastName).length < 2) {
    errors.lastName = 'Last name must be at least 2 characters.'
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.phoneNumber) {
    errors.phoneNumber = 'Phone number is required.'
  } else if (!isPossiblePhoneNumber(values.phoneNumber)) {
    errors.phoneNumber = 'Enter a valid phone number.'
  }

  if (!values.password) {
    errors.password = 'Password is required.'
  } else if (!isStrongPassword(values.password)) {
    errors.password = PASSWORD_POLICY_TEXT
  }



  return errors
}

export function validateResetPassword(
  values: ResetPasswordValues
): FieldErrors<ResetPasswordField> {
  const errors: FieldErrors<ResetPasswordField> = {}

  if (!values.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Enter a valid email address.'
  }

  return errors
}

export function validateUpdatePassword(
  values: UpdatePasswordValues
): FieldErrors<UpdatePasswordField> {
  const errors: FieldErrors<UpdatePasswordField> = {}

  if (!values.newPassword) {
    errors.newPassword = 'New password is required.'
  } else if (!isStrongPassword(values.newPassword)) {
    errors.newPassword = PASSWORD_POLICY_TEXT
  }

  if (!values.confirmNewPassword) {
    errors.confirmNewPassword = 'Please confirm your new password.'
  } else if (values.confirmNewPassword !== values.newPassword) {
    errors.confirmNewPassword = 'Passwords do not match.'
  }

  return errors
}

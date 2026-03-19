export type FieldErrors<T extends string> = Partial<Record<T, string>> & {
  form?: string
}

export type LoginField = 'email' | 'password' | 'rememberMe'

export type LoginValues = {
  email: string
  password: string
  rememberMe: boolean
}

export type RegisterField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'password'
  | 'agreeToTerms'

export type RegisterValues = {
  firstName: string
  lastName: string
  email: string
  password: string
  agreeToTerms: boolean
}

export type ResetPasswordField = 'email'

export type ResetPasswordValues = {
  email: string
}

export type UpdatePasswordField = 'newPassword' | 'confirmNewPassword'

export type UpdatePasswordValues = {
  newPassword: string
  confirmNewPassword: string
}

export type AccountTypeOption = {
  id: string
  title: string
  description: string
}

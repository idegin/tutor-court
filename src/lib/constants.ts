export const CREDIT_RATE = {
  coinsPerNaira: 0.1,
  nairaPerCoin: 10,
  coinsPerHour: 60,
  coinsPerMinute: 1,
  minimumClassCredits: 60,
} as const

export const MANAGED_ACCOUNT_DOMAIN = 'tutorcourt.local'

export const CURRENCIES = {
  ngn: { code: 'ngn', label: 'NGN', symbol: '₦' },
  usd: { code: 'usd', label: 'USD', symbol: '$' },
} as const

export type CurrencyCode = keyof typeof CURRENCIES

export const ACCOUNT_TYPES = ['admin', 'tutor', 'parent', 'student'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const PAYSTACK = {
  initializeUrl: 'https://api.paystack.co/transaction/initialize',
  verifyUrl: 'https://api.paystack.co/transaction/verify',
} as const

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatCredits(credits: number): string {
  return `${credits.toLocaleString('en-NG')} ${credits === 1 ? 'credit' : 'credits'}`
}

export function nairaToCredits(naira: number): number {
  return Math.floor(naira * CREDIT_RATE.coinsPerNaira)
}

export function coinsToNaira(credits: number): number {
  return credits * CREDIT_RATE.nairaPerCoin
}

export const NIGERIAN_GRADES = [
  { label: 'Early years', value: 'early_years' },
  { label: 'Lower Primary', value: 'lower_primary' },
  { label: 'Upper Primary', value: 'upper_primary' },
  { label: 'Junior High School', value: 'junior_high_school' },
  { label: 'Senior High School', value: 'senior_high_school' },
] as const


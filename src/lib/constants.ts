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
  { label: 'Nursery 1', value: 'nursery_1' },
  { label: 'Nursery 2', value: 'nursery_2' },
  { label: 'Nursery 3', value: 'nursery_3' },
  { label: 'Primary 1', value: 'primary_1' },
  { label: 'Primary 2', value: 'primary_2' },
  { label: 'Primary 3', value: 'primary_3' },
  { label: 'Primary 4', value: 'primary_4' },
  { label: 'Primary 5', value: 'primary_5' },
  { label: 'Primary 6', value: 'primary_6' },
  { label: 'JSS 1', value: 'jss_1' },
  { label: 'JSS 2', value: 'jss_2' },
  { label: 'JSS 3', value: 'jss_3' },
  { label: 'SSS 1', value: 'sss_1' },
  { label: 'SSS 2', value: 'sss_2' },
  { label: 'SSS 3', value: 'sss_3' },
] as const


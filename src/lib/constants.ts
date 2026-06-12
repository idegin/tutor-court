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
  { label: 'Kindergarten', value: 'kindergarten' },
  { label: 'Grade 1', value: 'grade_1' },
  { label: 'Grade 2', value: 'grade_2' },
  { label: 'Grade 3', value: 'grade_3' },
  { label: 'Grade 4', value: 'grade_4' },
  { label: 'Grade 5', value: 'grade_5' },
  { label: 'Grade 6', value: 'grade_6' },
  { label: 'Grade 7', value: 'grade_7' },
  { label: 'Grade 8', value: 'grade_8' },
  { label: 'Grade 9', value: 'grade_9' },
  { label: 'Grade 10', value: 'grade_10' },
  { label: 'Grade 11', value: 'grade_11' },
  { label: 'Grade 12', value: 'grade_12' },
  { label: 'Others', value: 'others' },
] as const


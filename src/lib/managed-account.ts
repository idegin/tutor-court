import { MANAGED_ACCOUNT_DOMAIN } from './constants'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const PASSWORD_CHARSET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

export function generateManagedPassword(length = 12): string {
  let out = ''
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * PASSWORD_CHARSET.length)
    out += PASSWORD_CHARSET[idx]
  }
  return out
}

export async function generateManagedEmail(
  payload: any,
  firstName: string,
  lastName: string,
): Promise<string> {
  const first = slugify(firstName) || 'student'
  const last = slugify(lastName) || 'user'
  const base = `${first}.${last}`
  let candidate = `${base}@${MANAGED_ACCOUNT_DOMAIN}`
  let attempt = 0

  while (attempt < 50) {
    const { totalDocs } = await payload.find({
      collection: 'users',
      where: { email: { equals: candidate } },
      limit: 1,
      depth: 0,
    })
    if (totalDocs === 0) return candidate

    attempt += 1
    const suffix = Math.random().toString(36).slice(2, 6)
    candidate = `${base}.${suffix}@${MANAGED_ACCOUNT_DOMAIN}`
  }

  return `${base}.${Date.now().toString(36)}@${MANAGED_ACCOUNT_DOMAIN}`
}

export function isManagedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${MANAGED_ACCOUNT_DOMAIN}`)
}

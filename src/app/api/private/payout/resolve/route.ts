import { NextResponse } from 'next/server'
import { getServerSideUser } from '@/lib/auth'
import { resolveAccount } from '@/lib/paystack'

/**
 * POST /api/private/payout/resolve — verify a bank account number against a bank
 * code via Paystack and return the real account name (for the tutor to confirm
 * before saving). Body: { bankCode, accountNumber }.
 */
export async function POST(request: Request) {
  const { user } = await getServerSideUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can set up payouts.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const bankCode = typeof body?.bankCode === 'string' ? body.bankCode.trim() : ''
  const accountNumber = typeof body?.accountNumber === 'string' ? body.accountNumber.trim() : ''
  if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: 'Select a bank and enter a valid 10-digit account number.' }, { status: 400 })
  }

  try {
    const resolved = await resolveAccount(accountNumber, bankCode)
    if (!resolved.accountName) {
      return NextResponse.json({ error: 'Could not verify this account. Check the details and try again.' }, { status: 422 })
    }
    return NextResponse.json({ accountName: resolved.accountName, accountNumber: resolved.accountNumber })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Account verification failed.' }, { status: 422 })
  }
}

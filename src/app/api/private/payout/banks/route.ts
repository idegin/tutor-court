import { NextResponse } from 'next/server'
import { getServerSideUser } from '@/lib/auth'
import { listBanks } from '@/lib/paystack'

/** GET /api/private/payout/banks — Nigerian banks for the tutor payout picker. */
export async function GET() {
  const { user } = await getServerSideUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can set up payouts.' }, { status: 403 })
  }
  try {
    const banks = await listBanks('NGN')
    return NextResponse.json({ banks })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Could not load banks.' }, { status: 502 })
  }
}

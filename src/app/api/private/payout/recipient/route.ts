import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'
import { resolveAccount, createTransferRecipient } from '@/lib/paystack'

async function tutorProfileForUser(payload: any, userId: string | number) {
  const res = await payload.find({
    collection: 'tutor-profiles',
    where: { user: { equals: userId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs[0] || null
}

/** GET /api/private/payout/recipient — the tutor's saved payout settings. */
export async function GET() {
  const { user } = await getServerSideUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors have payout settings.' }, { status: 403 })
  }
  const payload = await getPayload({ config })
  const profile: any = await tutorProfileForUser(payload, user.id)
  return NextResponse.json({
    payout: profile
      ? {
          bankCode: profile.payoutBankCode || null,
          bankName: profile.payoutBankName || null,
          accountNumber: profile.payoutAccountNumber || null,
          accountName: profile.payoutAccountName || null,
          configured: Boolean(profile.payoutRecipientCode),
        }
      : null,
  })
}

/**
 * POST /api/private/payout/recipient — verify the account, create a Paystack
 * transfer recipient, and persist it on the tutor profile. Body: { bankCode,
 * accountNumber, bankName? }.
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
  const bankNameHint = typeof body?.bankName === 'string' ? body.bankName.trim() : ''
  if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: 'Select a bank and enter a valid 10-digit account number.' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const profile: any = await tutorProfileForUser(payload, user.id)
  if (!profile) {
    return NextResponse.json({ error: 'Tutor profile not found.' }, { status: 404 })
  }

  try {
    // Re-verify server-side (never trust a client-supplied name), then create the
    // Paystack transfer recipient.
    const resolved = await resolveAccount(accountNumber, bankCode)
    if (!resolved.accountName) {
      return NextResponse.json({ error: 'Could not verify this account.' }, { status: 422 })
    }
    const recipient = await createTransferRecipient({
      accountName: resolved.accountName,
      accountNumber,
      bankCode,
    })
    if (!recipient.recipientCode) {
      return NextResponse.json({ error: 'Could not create the payout recipient.' }, { status: 502 })
    }

    await payload.update({
      collection: 'tutor-profiles',
      id: profile.id,
      data: {
        payoutBankCode: bankCode,
        payoutBankName: recipient.bankName || bankNameHint || null,
        payoutAccountNumber: accountNumber,
        payoutAccountName: resolved.accountName,
        payoutRecipientCode: recipient.recipientCode,
      } as any,
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      payout: {
        bankCode,
        bankName: recipient.bankName || bankNameHint || null,
        accountNumber,
        accountName: resolved.accountName,
        configured: true,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Could not save payout details.' }, { status: 502 })
  }
}

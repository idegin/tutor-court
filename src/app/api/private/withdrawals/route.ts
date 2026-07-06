import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'

/**
 * POST /api/private/withdrawals — a tutor requests a withdrawal of spendable
 * wallet funds to a bank account. The amount is reserved (lockedBalance += amount)
 * and a `payout-requests` record is created for admin approval; on approval the
 * funds leave the wallet and a `payout` transaction is booked (see the
 * PayoutRequests afterChange hook).
 */
export async function POST(request: Request) {
  const { user } = await getServerSideUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can withdraw earnings.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const amount = Number(body?.amount)
  const bankName = typeof body?.bankName === 'string' ? body.bankName.trim() : ''
  const accountNumber = typeof body?.accountNumber === 'string' ? body.accountNumber.trim() : ''
  const accountName = typeof body?.accountName === 'string' ? body.accountName.trim() : ''

  if (!(amount > 0)) {
    return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 })
  }
  if (!bankName || !accountNumber || !accountName) {
    return NextResponse.json({ error: 'Bank name, account number and account name are required.' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  const walletRes = await payload.find({
    collection: 'wallets',
    where: { user: { equals: user.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const wallet = walletRes.docs[0] as any
  if (!wallet) return NextResponse.json({ error: 'Wallet not found.' }, { status: 404 })

  const transactionID = (await payload.db.beginTransaction()) || undefined
  const req = transactionID ? ({ transactionID } as any) : undefined
  try {
    // Re-read inside the transaction; only spendable (balance − locked) can be withdrawn.
    const fresh: any = await payload
      .findByID({ collection: 'wallets', id: wallet.id, depth: 0, overrideAccess: true, req })
      .catch(() => wallet)
    const balance = Number(fresh?.balance) || 0
    const locked = Number(fresh?.lockedBalance) || 0
    const spendable = balance - locked
    if (amount > spendable) {
      if (transactionID) await payload.db.rollbackTransaction(transactionID)
      return NextResponse.json(
        { error: 'Amount exceeds your available balance.', spendable },
        { status: 400 },
      )
    }

    // Reserve the funds so they can't be double-withdrawn while pending.
    await payload.update({
      collection: 'wallets',
      id: wallet.id,
      data: { lockedBalance: locked + amount } as any,
      req,
      overrideAccess: true,
    })

    const record = await payload.create({
      collection: 'payout-requests',
      data: {
        tutor: user.id,
        amount,
        currency: fresh?.currency || 'ngn',
        bankName,
        accountNumber,
        accountName,
        status: 'requested',
      } as any,
      req,
      overrideAccess: true,
    })

    if (transactionID) await payload.db.commitTransaction(transactionID)
    return NextResponse.json({ success: true, request: record })
  } catch (e: any) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    return NextResponse.json({ error: e?.message || 'Withdrawal request failed.' }, { status: 500 })
  }
}

import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CREDIT_RATE } from '@/lib/constants'
import { spendBalanceForCreditsAtomic } from '@/lib/escrow'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const credits = Number(body?.credits)
  if (isNaN(credits) || credits <= 0) {
    return NextResponse.json({ error: 'Valid number of credits is required.' }, { status: 400 })
  }

  const cost = credits * CREDIT_RATE.nairaPerCoin

  try {
    const wallets = await payload.find({
      collection: 'wallets',
      where: { user: { equals: user.id } },
      limit: 1,
      depth: 0,
    })

    if (wallets.docs.length === 0) {
      return NextResponse.json({ error: 'Wallet not found.' }, { status: 404 })
    }

    const wallet = wallets.docs[0]

    // Atomic + all-or-nothing: debit spendable and grant credits in one guarded
    // statement (no double-spend of reserved funds), then book the ledger row in
    // the same transaction.
    const transactionID = (await payload.db.beginTransaction()) || undefined
    const req = transactionID ? ({ transactionID } as any) : undefined
    try {
      // Spendable only — funds reserved for escrow / a pending withdrawal can't
      // be spent on credits (otherwise a tutor could double-spend a reserved payout).
      const spend = await spendBalanceForCreditsAtomic(payload, req, wallet.id, cost, credits)
      if (!spend.ok) {
        if (transactionID) await payload.db.rollbackTransaction(transactionID)
        return NextResponse.json(
          { error: 'Insufficient available wallet balance. Please fund your wallet first.' },
          { status: 400 },
        )
      }

      await payload.create({
        collection: 'transactions',
        data: {
          reference: `credits-${user.id}-${Date.now()}`,
          gateway: 'wallet',
          type: 'payment',
          sender: user.id,
          receiver: user.id,
          amount: cost,
          currency: 'ngn',
          status: 'success',
          description: `Purchased ${credits} credits from wallet balance.`,
        } as any,
        req,
        overrideAccess: true,
      })

      if (transactionID) await payload.db.commitTransaction(transactionID)
      return NextResponse.json({
        success: true,
        balance: spend.balance,
        creditBalance: spend.creditBalance,
      })
    } catch (e: any) {
      if (transactionID) await payload.db.rollbackTransaction(transactionID)
      throw e
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

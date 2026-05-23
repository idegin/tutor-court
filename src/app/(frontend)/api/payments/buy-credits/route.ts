import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CREDIT_RATE } from '@/lib/constants'

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
    const balance = (wallet.balance as number) || 0
    const creditBalance = (wallet.creditBalance as number) || 0

    if (balance < cost) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance. Please fund your wallet first.' },
        { status: 400 },
      )
    }

    // Update wallet
    const updatedWallet = await payload.update({
      collection: 'wallets',
      id: wallet.id,
      data: {
        balance: balance - cost,
        creditBalance: creditBalance + credits,
      } as any,
    })

    // Create debit transaction for buying credits (sender and receiver point to the user)
    await payload.create({
      collection: 'transactions',
      data: {
        sender: user.id,
        receiver: user.id,
        amount: cost,
        currency: 'ngn',
        status: 'paid',
      } as any,
    })

    return NextResponse.json({
      success: true,
      balance: updatedWallet.balance,
      creditBalance: updatedWallet.creditBalance,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

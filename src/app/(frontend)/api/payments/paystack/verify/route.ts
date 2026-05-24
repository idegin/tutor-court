import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')

  if (!reference) {
    return NextResponse.json({ error: 'Reference is required.' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      return NextResponse.json({ error: 'Paystack is not configured.' }, { status: 500 })
    }

    // Verify transaction with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      },
    })

    const verifyData = await verifyRes.json()
    if (!verifyRes.ok || !verifyData.status) {
      return NextResponse.json({ error: verifyData.message || 'Verification failed.' }, { status: 400 })
    }

    const data = verifyData.data
    if (data.status !== 'success') {
      return NextResponse.json({ error: 'Transaction was not successful.' }, { status: 400 })
    }

    const amountNaira = data.amount / 100
    const metadata = data.metadata
    const userId = metadata?.userId
    const purpose = metadata?.purpose

    if (String(userId) !== String(user.id) || purpose !== 'wallet_funding') {
      return NextResponse.json({ error: 'Invalid transaction metadata.' }, { status: 400 })
    }

    // Check if transaction has already been recorded
    const existingTransactions = await payload.find({
      collection: 'transactions',
      where: { reference: { equals: reference } },
      limit: 1,
      depth: 0,
    })

    // Find user wallet
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
    let updatedWallet = wallet

    if (existingTransactions.docs.length === 0) {
      const currentBalance = (wallet.balance as number) || 0

      // Update wallet balance
      updatedWallet = await payload.update({
        collection: 'wallets',
        id: wallet.id,
        data: {
          balance: currentBalance + amountNaira,
        } as any,
      })

      // Create transaction record
      await payload.create({
        collection: 'transactions',
        data: {
          reference,
          gateway: 'paystack',
          type: 'deposit',
          sender: user.id,
          receiver: user.id,
          amount: amountNaira,
          currency: 'ngn',
          status: 'success',
          description: 'Paystack wallet funding (verified)',
          metadata: data,
        } as any,
      })

      console.log(`Verified & successfully funded wallet for user ${user.id} with ₦${amountNaira}`)
    }

    return NextResponse.json({ success: true, wallet: updatedWallet })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

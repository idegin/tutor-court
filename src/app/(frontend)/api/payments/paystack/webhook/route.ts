import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'

export async function POST(request: Request) {
  const payload = await getPayload({ config })

  const signature = request.headers.get('x-paystack-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY
  if (!paystackSecret) {
    return NextResponse.json({ error: 'Paystack secret key is missing.' }, { status: 500 })
  }

  const computed = crypto
    .createHmac('sha512', paystackSecret)
    .update(rawBody)
    .digest('hex')

  if (computed !== signature) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (event.event === 'charge.success') {
    const data = event.data
    const reference = data.reference
    const amountKobo = data.amount
    const amountNaira = amountKobo / 100
    const metadata = data.metadata
    const userId = metadata?.userId
    const purpose = metadata?.purpose

    if (userId && purpose === 'wallet_funding') {
      try {
        // Find user wallet
        const wallets = await payload.find({
          collection: 'wallets',
          where: { user: { equals: userId } },
          limit: 1,
          depth: 0,
        })

        if (wallets.docs.length > 0) {
          const wallet = wallets.docs[0]
          const currentBalance = (wallet.balance as number) || 0

          // Update wallet
          await payload.update({
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
              sender: userId,
              receiver: userId,
              amount: amountNaira,
              currency: 'ngn',
              status: 'paid',
            } as any,
          })

          console.log(`Successfully funded wallet for user ${userId} with ₦${amountNaira}`)
        } else {
          console.error(`Wallet not found for user ${userId}`)
        }
      } catch (err: any) {
        console.error(`Error processing wallet funding webhook:`, err)
        return NextResponse.json({ error: err.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ ok: true })
}

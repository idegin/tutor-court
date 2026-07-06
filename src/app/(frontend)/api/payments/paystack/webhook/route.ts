import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'
import { holdBookingEscrow } from '@/lib/escrow'

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
    const rawUserId = metadata?.userId
    const purpose = metadata?.purpose
    const userId = typeof rawUserId === 'string' ? Number(rawUserId) : rawUserId

    // Direct booking payment → hold in escrow (idempotent + atomic helper).
    if (purpose === 'booking_escrow' && metadata?.bookingId) {
      const result = await holdBookingEscrow({
        payload,
        bookingId: metadata.bookingId,
        source: 'paystack',
        reference,
        metadata: data,
      })
      if (!result.ok) {
        console.error('[webhook] booking escrow hold failed:', result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
    } else if (userId && !Number.isNaN(userId) && purpose === 'wallet_funding') {
      try {
        // Idempotency FIRST: if this reference was already recorded, do nothing
        // (Paystack retries the webhook; crediting first would double-fund).
        const existing = await payload.find({
          collection: 'transactions',
          where: { reference: { equals: reference } },
          limit: 1,
          depth: 0,
        })
        if (existing.totalDocs > 0) {
          return NextResponse.json({ ok: true })
        }

        const wallets = await payload.find({
          collection: 'wallets',
          where: { user: { equals: userId } },
          limit: 1,
          depth: 0,
        })

        if (wallets.docs.length > 0) {
          const wallet = wallets.docs[0]
          const transactionID = (await payload.db.beginTransaction()) || undefined
          const req = transactionID ? ({ transactionID } as any) : undefined
          try {
            // Create the txn first — the unique `reference` blocks a concurrent
            // duplicate before any balance is touched.
            await payload.create({
              collection: 'transactions',
              data: {
                reference,
                gateway: 'paystack',
                type: 'deposit',
                sender: userId,
                receiver: userId,
                amount: amountNaira,
                currency: 'ngn',
                status: 'success',
                description: 'Paystack wallet funding',
                metadata: data,
              } as any,
              req,
            })
            await payload.update({
              collection: 'wallets',
              id: wallet.id,
              data: { balance: ((wallet.balance as number) || 0) + amountNaira } as any,
              req,
            })
            if (transactionID) await payload.db.commitTransaction(transactionID)
          } catch (e: any) {
            if (transactionID) await payload.db.rollbackTransaction(transactionID)
            // Duplicate reference (concurrent webhook) — safe to ignore.
            if (e?.code !== '23505' && !/reference|unique/i.test(String(e?.message || ''))) throw e
          }
          console.log(`Funded wallet for user ${userId} with ₦${amountNaira}`)
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

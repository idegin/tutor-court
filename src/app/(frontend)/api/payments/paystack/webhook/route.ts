import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'
import { holdBookingEscrow, creditWalletAtomic } from '@/lib/escrow'
import { emailUserById } from '@/lib/transactional-email'
import { createNotification } from '@/lib/notification-service'

/**
 * Finalize a tutor-withdrawal Paystack Transfer. Success just confirms +
 * notifies (the wallet was already debited on admin approval). Failure/reversal
 * RE-CREDITS the wallet (idempotent via a reversal transaction) and flips the
 * request back so the tutor can retry.
 */
async function handleTransferEvent(payload: any, event: any) {
  const data = event.data || {}
  const reference: string = data.reference || ''
  if (!reference) return

  const reqRes = await payload.find({
    collection: 'payout-requests',
    where: { transferReference: { equals: reference } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const request = reqRes.docs[0] as any
  if (!request) return

  const tutorId = typeof request.tutor === 'object' ? request.tutor.id : request.tutor
  const amount = Number(request.amount) || 0

  if (event.event === 'transfer.success') {
    if (request.transferStatus === 'success') return // idempotent
    await payload.update({
      collection: 'payout-requests',
      id: request.id,
      data: { transferStatus: 'success' } as any,
      overrideAccess: true,
    })
    await createNotification({
      recipientId: String(tutorId),
      type: 'payment_received',
      title: 'Withdrawal paid',
      message: `Your withdrawal of ₦${amount.toLocaleString()} was paid to your bank account.`,
      link: '/dashboard/tutor/wallet',
    }).catch(() => {})
    await emailUserById(
      payload,
      tutorId,
      'Your withdrawal was paid - TutorCourt',
      'Withdrawal paid',
      `<p class="text">Your withdrawal of <strong>₦${amount.toLocaleString()}</strong> has been paid to your bank account.</p>`,
      { link: '/dashboard/tutor/wallet', linkLabel: 'View wallet' },
    )
    return
  }

  // transfer.failed | transfer.reversed → return the funds to the wallet.
  if (request.transferStatus === 'failed') return // already reversed (idempotent)
  const walletRes = await payload.find({
    collection: 'wallets',
    where: { user: { equals: tutorId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const wallet = walletRes.docs[0] as any
  if (!wallet) return

  const reversalRef = `withdrawal-reversal-${request.id}`
  const existing = await payload.find({
    collection: 'transactions',
    where: { reference: { equals: reversalRef } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const transactionID = (await payload.db.beginTransaction()) || undefined
  const req = transactionID ? ({ transactionID } as any) : undefined
  try {
    if (existing.totalDocs === 0) {
      await payload.create({
        collection: 'transactions',
        data: {
          reference: reversalRef,
          gateway: 'paystack',
          type: 'refund',
          sender: tutorId,
          receiver: tutorId,
          amount,
          currency: request.currency || 'ngn',
          status: 'reversed',
          description: 'Withdrawal failed — funds returned to wallet',
        } as any,
        req,
      })
      await creditWalletAtomic(payload, req, wallet.id, amount)
    }
    await payload.update({
      collection: 'payout-requests',
      id: request.id,
      data: { transferStatus: 'failed', status: 'rejected', adminNote: 'Paystack transfer failed — auto-reversed.' } as any,
      req,
    })
    if (transactionID) await payload.db.commitTransaction(transactionID)
  } catch (e: any) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    if (e?.code !== '23505' && !/reference|unique/i.test(String(e?.message || ''))) throw e
  }
  await createNotification({
    recipientId: String(tutorId),
    type: 'general',
    title: 'Withdrawal failed',
    message: `Your withdrawal of ₦${amount.toLocaleString()} could not be completed. The funds are back in your wallet.`,
    link: '/dashboard/tutor/wallet',
  }).catch(() => {})
  await emailUserById(
    payload,
    tutorId,
    'Your withdrawal could not be completed - TutorCourt',
    'Withdrawal failed',
    `<p class="text">Your withdrawal of <strong>₦${amount.toLocaleString()}</strong> could not be completed, so the funds have been returned to your wallet balance. You can update your bank details and try again.</p>`,
    { link: '/dashboard/tutor/wallet', linkLabel: 'View wallet' },
  )
}

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

  if (
    event.event === 'transfer.success' ||
    event.event === 'transfer.failed' ||
    event.event === 'transfer.reversed'
  ) {
    try {
      await handleTransferEvent(payload, event)
    } catch (err: any) {
      console.error('[webhook] transfer event failed:', err?.message)
      return NextResponse.json({ error: err?.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
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
            await creditWalletAtomic(payload, req, wallet.id, amountNaira)
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

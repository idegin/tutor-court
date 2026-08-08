import type { Payload } from 'payload'
import { creditWalletAtomic } from './escrow'
import { createNotification } from './notification-service'
import { emailUserById } from './transactional-email'

/**
 * Tutor-withdrawal finalization, shared by the Paystack transfer webhook and the
 * reconciliation cron. Both success and reversal are idempotent so duplicate /
 * out-of-order webhook + cron calls converge safely.
 *
 * Money model: the wallet is debited when the admin approves (PayoutRequests
 * hook). Success just confirms + notifies. Failure/reversal RE-CREDITS the
 * wallet, guarded by a unique `withdrawal-reversal-{id}` transaction so it fires
 * at most once even if transfer.failed AND transfer.reversed both arrive.
 */

const idOf = (rel: any): string | number | null =>
  rel == null ? null : typeof rel === 'object' ? rel.id : rel

/** Parse the payout-request id out of our deterministic transfer reference. */
export function withdrawalIdFromReference(reference: string): string | null {
  const m = /^withdrawal-(.+)$/.exec(reference || '')
  return m ? m[1] : null
}

export async function markWithdrawalPaid(payload: Payload, request: any): Promise<void> {
  const tutorId = idOf(request.tutor)
  const amount = Number(request.amount) || 0
  // Never mark a reversed payout as paid: if the reversal ledger row exists, the
  // funds were returned — a success signal arriving afterwards must be ignored.
  const reversed = await payload.find({
    collection: 'transactions',
    where: { reference: { equals: `withdrawal-reversal-${request.id}` } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (reversed.totalDocs > 0) return
  // Transition gate: only flip processing → success (a conditional bulk update,
  // not a by-id write on a stale snapshot), so a row already 'success'/'failed'
  // matches 0 rows and the notification isn't re-sent on the common sequential
  // webhook/cron race.
  const upd = await payload.update({
    collection: 'payout-requests',
    where: { and: [{ id: { equals: request.id } }, { transferStatus: { equals: 'processing' } }] } as any,
    data: { transferStatus: 'success' } as any,
    overrideAccess: true,
  })
  if (!upd?.docs?.length) return // someone else already finalized it
  if (tutorId != null) {
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
  }
}

export async function reverseWithdrawal(payload: Payload, request: any, note = 'Paystack transfer failed — auto-reversed.'): Promise<void> {
  const tutorId = idOf(request.tutor)
  const amount = Number(request.amount) || 0
  if (tutorId == null) return

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
  // Fast path: reversal already booked → nothing to do.
  const existing = await payload.find({
    collection: 'transactions',
    where: { reference: { equals: reversalRef } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.totalDocs > 0) return

  // The unique `withdrawal-reversal-{id}` reference is the single idempotency
  // guard for the WHOLE reversal (re-credit + status + notify): only the caller
  // that successfully creates it proceeds. A concurrent racer hits the unique
  // constraint (23505), rolls back, and returns silently — so the wallet is
  // re-credited once and the tutor is notified once.
  const transactionID = (await payload.db.beginTransaction()) || undefined
  const req = transactionID ? ({ transactionID } as any) : undefined
  let didReverse = false
  try {
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
      overrideAccess: true,
    })
    await creditWalletAtomic(payload, req, wallet.id, amount)
    await payload.update({
      collection: 'payout-requests',
      id: request.id,
      data: { transferStatus: 'failed', status: 'rejected', adminNote: note } as any,
      req,
      overrideAccess: true,
    })
    if (transactionID) await payload.db.commitTransaction(transactionID)
    didReverse = true
  } catch (e: any) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    // Concurrent racer already reversed it → not an error.
    if (e?.code === '23505' || /reference|unique/i.test(String(e?.message || ''))) return
    throw e
  }

  if (!didReverse) return
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

import type { Payload } from 'payload'

/**
 * Booking escrow.
 *
 * Wallet accounting model (matches Wallets.ts): `balance` is the TOTAL money in
 * the wallet; `lockedBalance` is the portion reserved for in-flight bookings;
 * spendable/available = `balance - lockedBalance`.
 *
 *  - Wallet hold:   reserve existing funds → lockedBalance += price (balance unchanged).
 *  - Paystack hold: fresh funds arrive → balance += price AND lockedBalance += price
 *                   (total grows, but the new funds are fully reserved, so available
 *                    is unchanged).
 *  - Release/refund: unreserve → lockedBalance -= price (the funds become spendable).
 *
 * All multi-write operations run inside a Payload DB transaction (atomic) and are
 * idempotent via the unique `transactions.reference`.
 */

const idOf = (rel: any): string | number | null =>
  rel == null ? null : typeof rel === 'object' ? rel.id : rel

const numericId = (v: any): string | number =>
  typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v

const isDupRef = (e: any): boolean =>
  e?.code === '23505' || /reference/i.test(String(e?.message || '')) || /unique/i.test(String(e?.message || ''))

export interface HoldEscrowParams {
  payload: Payload
  bookingId: string | number
  source: 'wallet' | 'paystack'
  /** Idempotency key. Wallet: deterministic per booking. Paystack: the gateway reference. */
  reference: string
  /** Raw gateway payload (Paystack verify/webhook data) — used for the actual collected amount. */
  metadata?: any
}

export interface HoldEscrowResult {
  ok: boolean
  status?: number
  error?: string
  shortfall?: number
  alreadyHeld?: boolean
  held?: boolean
  /** A real payment arrived for an already-funded booking; credited to the wallet instead. */
  creditedToWallet?: boolean
}

export async function holdBookingEscrow({
  payload,
  bookingId,
  source,
  reference,
  metadata,
}: HoldEscrowParams): Promise<HoldEscrowResult> {
  let booking: any
  try {
    booking = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 2, overrideAccess: true })
  } catch {
    return { ok: false, status: 404, error: 'Booking not found.' }
  }
  if (!booking) return { ok: false, status: 404, error: 'Booking not found.' }

  const price = Number(booking.price) || 0
  if (price <= 0) return { ok: false, status: 400, error: 'This booking has no payable amount.' }

  const currency = booking.currency || 'ngn'

  // (1) Same reference already processed → true idempotent success.
  const existing = await payload.find({
    collection: 'transactions',
    where: { reference: { equals: reference } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.totalDocs > 0) return { ok: true, alreadyHeld: true }

  const bookerUserId = booking.parent ? idOf(booking.parent) : idOf(booking.student)
  if (!bookerUserId) return { ok: false, status: 400, error: 'Booking has no booker.' }

  const tutorProfile = booking.tutor
  const tutorUserId =
    tutorProfile && typeof tutorProfile === 'object' ? idOf(tutorProfile.user) : null

  const walletRes = await payload.find({
    collection: 'wallets',
    where: { user: { equals: bookerUserId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const wallet = walletRes.docs[0] as any
  if (!wallet) return { ok: false, status: 400, error: 'Wallet not found for booker.' }
  if ((wallet.currency || 'ngn') !== currency) {
    return { ok: false, status: 400, error: 'Wallet currency does not match the booking currency.' }
  }

  // (2) Booking already funded by an EARLIER hold (a different reference).
  if (booking.paymentStatus === 'held' || booking.paymentStatus === 'paid') {
    if (source === 'paystack') {
      // A real card charge landed for an already-paid booking (double pay). Do
      // NOT drop it — credit the collected amount to the booker's wallet so no
      // money is lost. (An admin can refund it out-of-band.)
      const collected = metadata?.amount ? Number(metadata.amount) / 100 : price
      return await creditToWallet({
        payload,
        walletId: wallet.id,
        currentBalance: Number(wallet.balance) || 0,
        amount: collected,
        reference,
        userId: bookerUserId,
        currency,
        metadata,
        note: 'Overpayment for an already-funded booking (credited to wallet)',
      })
    }
    return { ok: true, alreadyHeld: true }
  }

  // (3) Must be confirmed to fund.
  if (booking.status !== 'confirmed') {
    return { ok: false, status: 409, error: 'Only a confirmed booking can be paid.' }
  }

  // Atomicity is REQUIRED for money — refuse rather than write non-atomically.
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) {
    return { ok: false, status: 500, error: 'Payment could not be processed atomically. Please retry.' }
  }
  const req = { transactionID } as any
  try {
    // Re-read the wallet inside the transaction so the funds check uses a fresh
    // value (narrows the concurrent-hold window).
    const freshRes = await payload.find({
      collection: 'wallets',
      where: { user: { equals: bookerUserId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const fresh = (freshRes.docs[0] as any) || wallet
    const balance = Number(fresh.balance) || 0
    const locked = Number(fresh.lockedBalance) || 0

    if (source === 'wallet' && balance - locked < price) {
      await payload.db.rollbackTransaction(transactionID)
      return { ok: false, status: 400, error: 'Insufficient wallet balance.', shortfall: Math.max(0, price - (balance - locked)) }
    }

    const txn = await payload.create({
      collection: 'transactions',
      data: {
        reference,
        gateway: source === 'wallet' ? 'wallet' : 'paystack',
        type: 'payment',
        sender: numericId(bookerUserId),
        receiver: numericId(bookerUserId),
        ...(tutorUserId ? { tutor: numericId(tutorUserId) } : {}),
        relatedBooking: numericId(bookingId),
        amount: price,
        currency,
        status: 'success',
        description: 'Booking payment held in escrow',
        ...(metadata ? { metadata } : {}),
      } as any,
      req,
      overrideAccess: true,
    })

    const walletData =
      source === 'wallet'
        ? { lockedBalance: locked + price } // reserve existing funds
        : { balance: balance + price, lockedBalance: locked + price } // add fresh + reserve
    await payload.update({ collection: 'wallets', id: fresh.id, data: walletData as any, req, overrideAccess: true })

    await payload.update({
      collection: 'bookings',
      id: bookingId,
      data: { paymentStatus: 'held', transaction: txn.id } as any,
      req,
      overrideAccess: true,
    })

    await payload.db.commitTransaction(transactionID)
    return { ok: true, held: true }
  } catch (e: any) {
    await payload.db.rollbackTransaction(transactionID)
    if (isDupRef(e)) return { ok: true, alreadyHeld: true } // concurrent same-reference hold
    return { ok: false, status: 500, error: e?.message || 'Escrow hold failed.' }
  }
}

/** Credit funds to a wallet's spendable balance + record a deposit transaction (atomic, idempotent). */
async function creditToWallet({
  payload,
  walletId,
  currentBalance,
  amount,
  reference,
  userId,
  currency,
  metadata,
  note,
}: {
  payload: Payload
  walletId: string | number
  currentBalance: number
  amount: number
  reference: string
  userId: string | number
  currency: string
  metadata?: any
  note: string
}): Promise<HoldEscrowResult> {
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) return { ok: false, status: 500, error: 'Could not process atomically.' }
  const req = { transactionID } as any
  try {
    await payload.create({
      collection: 'transactions',
      data: {
        reference,
        gateway: 'paystack',
        type: 'deposit',
        sender: numericId(userId),
        receiver: numericId(userId),
        amount,
        currency,
        status: 'success',
        description: note,
        ...(metadata ? { metadata } : {}),
      } as any,
      req,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'wallets',
      id: walletId,
      data: { balance: currentBalance + amount } as any,
      req,
      overrideAccess: true,
    })
    await payload.db.commitTransaction(transactionID)
    return { ok: true, creditedToWallet: true }
  } catch (e: any) {
    await payload.db.rollbackTransaction(transactionID)
    if (isDupRef(e)) return { ok: true, alreadyHeld: true }
    return { ok: false, status: 500, error: e?.message || 'Wallet credit failed.' }
  }
}

/**
 * Release a booking's escrowed funds back to the booker's spendable balance —
 * used when a funded (held) booking is cancelled/refunded. Unreserves the price
 * (lockedBalance -= price) and records a `refund` transaction. Idempotent.
 */
export async function releaseBookingEscrow({
  payload,
  bookingId,
}: {
  payload: Payload
  bookingId: string | number
}): Promise<HoldEscrowResult> {
  let booking: any
  try {
    booking = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 2, overrideAccess: true })
  } catch {
    return { ok: false, status: 404, error: 'Booking not found.' }
  }
  if (!booking) return { ok: false, status: 404, error: 'Booking not found.' }
  if (booking.paymentStatus !== 'held') return { ok: true, alreadyHeld: false } // nothing to release

  const price = Number(booking.price) || 0
  const currency = booking.currency || 'ngn'
  const bookerUserId = booking.parent ? idOf(booking.parent) : idOf(booking.student)
  const reference = `escrow-refund-${bookingId}`

  const existing = await payload.find({
    collection: 'transactions',
    where: { reference: { equals: reference } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.totalDocs > 0) return { ok: true, alreadyHeld: true }

  const walletRes = await payload.find({
    collection: 'wallets',
    where: { user: { equals: bookerUserId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const wallet = walletRes.docs[0] as any
  if (!wallet) return { ok: false, status: 400, error: 'Wallet not found.' }

  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) return { ok: false, status: 500, error: 'Could not process atomically.' }
  const req = { transactionID } as any
  try {
    const freshRes = await payload.find({
      collection: 'wallets',
      where: { user: { equals: bookerUserId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const fresh = (freshRes.docs[0] as any) || wallet
    const locked = Number(fresh.lockedBalance) || 0

    await payload.create({
      collection: 'transactions',
      data: {
        reference,
        gateway: 'wallet',
        type: 'refund',
        sender: numericId(bookerUserId),
        receiver: numericId(bookerUserId),
        relatedBooking: numericId(bookingId),
        amount: price,
        currency,
        status: 'success',
        description: 'Booking cancelled — escrow released to wallet',
      } as any,
      req,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'wallets',
      id: fresh.id,
      data: { lockedBalance: Math.max(0, locked - price) } as any,
      req,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'bookings',
      id: bookingId,
      data: { paymentStatus: 'refunded' } as any,
      req,
      overrideAccess: true,
    })
    await payload.db.commitTransaction(transactionID)
    return { ok: true, held: false }
  } catch (e: any) {
    await payload.db.rollbackTransaction(transactionID)
    if (isDupRef(e)) return { ok: true, alreadyHeld: true }
    return { ok: false, status: 500, error: e?.message || 'Escrow release failed.' }
  }
}

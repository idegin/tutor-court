import type { Payload } from 'payload'
import { materializeClassFromBooking } from './booking-to-class'
import { countSessions } from './booking-pricing'

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
  /** No escrow action was applicable (e.g. a non-booking / SaaS class). */
  skipped?: boolean
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

  // (2) If the booking can't be held right now (already held/paid, cancelled,
  //     refunded, or no longer confirmed), a real Paystack charge must NOT be
  //     dropped — credit the collected amount to the booker's wallet instead.
  const canHold = booking.status === 'confirmed' && booking.paymentStatus === 'unpaid'
  if (!canHold) {
    if (source === 'paystack') {
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
        note: 'Payment for a booking that could not be escrowed (credited to wallet)',
      })
    }
    if (booking.paymentStatus === 'held' || booking.paymentStatus === 'paid') {
      return { ok: true, alreadyHeld: true }
    }
    return { ok: false, status: 409, error: 'This booking is no longer awaiting payment.' }
  }

  // Atomicity is REQUIRED for money — refuse rather than write non-atomically.
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) {
    return { ok: false, status: 500, error: 'Payment could not be processed atomically. Please retry.' }
  }
  const req = { transactionID } as any
  try {
    // Re-read the booking inside the transaction — if it was cancelled/paid by a
    // concurrent request, abort (don't hold a cancelled booking; preserve any
    // real Paystack money to the wallet).
    const freshBooking: any = await payload
      .findByID({ collection: 'bookings', id: bookingId, depth: 0, overrideAccess: true, req })
      .catch(() => null)
    if (!freshBooking || freshBooking.status !== 'confirmed' || freshBooking.paymentStatus !== 'unpaid') {
      await payload.db.rollbackTransaction(transactionID)
      if (source === 'paystack') {
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
          note: 'Payment for a booking that could not be escrowed (credited to wallet)',
        })
      }
      return { ok: true, alreadyHeld: true }
    }

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

    // Stage 5: once funded, materialize the schedulable class (post-commit, so a
    // class-gen hiccup never rolls back the payment).
    await materializeClassFromBooking(payload, bookingId).catch(() => {})

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
    // Create the txn first — its unique `reference` blocks a duplicate credit
    // before any balance is touched.
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
    // Re-read the balance inside the transaction (avoid a stale outer read
    // clobbering a concurrent credit).
    const fresh: any = await payload
      .findByID({ collection: 'wallets', id: walletId, depth: 0, overrideAccess: true, req })
      .catch(() => null)
    const base = Number(fresh?.balance)
    await payload.update({
      collection: 'wallets',
      id: walletId,
      data: { balance: (isNaN(base) ? currentBalance : base) + amount } as any,
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
  if (!bookerUserId) return { ok: false, status: 400, error: 'Booking has no booker.' }
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

/**
 * Stage 6 (option a — "burn escrow per completed session"): when a booking-backed
 * live session ends, release that session's share of the held escrow FROM the
 * booker TO the tutor. Idempotent per session (`payout-session-{sessionId}`),
 * caps total released at the booking price, and marks the booking paid/completed
 * once fully released. No-op for SaaS (non-booking) classes.
 */
export async function payoutSessionEscrow({
  payload,
  sessionId,
  classId,
}: {
  payload: Payload
  sessionId: string | number
  classId: string | number
}): Promise<HoldEscrowResult> {
  let cls: any
  try {
    cls = await payload.findByID({ collection: 'classes', id: classId, depth: 0, overrideAccess: true })
  } catch {
    return { ok: false, status: 404, error: 'Class not found.' }
  }
  const bookingId = idOf(cls?.booking)
  if (!bookingId) return { ok: true, skipped: true } // SaaS class — nothing to release

  const booking: any = await payload
    .findByID({ collection: 'bookings', id: bookingId, depth: 2, overrideAccess: true })
    .catch(() => null)
  if (!booking || booking.paymentStatus !== 'held') return { ok: true, skipped: true }

  const reference = `payout-session-${sessionId}`
  const existing = await payload.find({
    collection: 'transactions',
    where: { reference: { equals: reference } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.totalDocs > 0) return { ok: true, alreadyHeld: true } // this session already paid out

  const price = Number(booking.price) || 0
  const currency = booking.currency || 'ngn'
  const bookerUserId = booking.parent ? idOf(booking.parent) : idOf(booking.student)
  const tutorUserId =
    booking.tutor && typeof booking.tutor === 'object' ? idOf(booking.tutor.user) : null
  if (!bookerUserId || !tutorUserId) return { ok: false, status: 400, error: 'Could not resolve booker/tutor.' }

  const totalSessions = Math.max(
    1,
    countSessions(booking.date, booking.endDate, booking.daysOfWeek || []),
  )

  // How much has already been released for this booking.
  const releasedRes = await payload.find({
    collection: 'transactions',
    where: { and: [{ relatedBooking: { equals: bookingId } }, { type: { equals: 'payout' } }] },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  const alreadyReleased = releasedRes.docs.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0)
  const remaining = Math.max(0, price - alreadyReleased)
  const share = Math.min(Math.round(price / totalSessions), remaining)

  // Nothing left to release — mark the engagement complete/paid out if not already.
  if (share <= 0) {
    if (booking.status !== 'completed' || booking.paymentStatus !== 'paid') {
      await payload
        .update({
          collection: 'bookings',
          id: bookingId,
          data: { paymentStatus: 'paid', status: 'completed' } as any,
          overrideAccess: true,
        })
        .catch(() => {})
    }
    return { ok: true }
  }

  const bookerWallet: any = (
    await payload.find({ collection: 'wallets', where: { user: { equals: bookerUserId } }, limit: 1, depth: 0, overrideAccess: true })
  ).docs[0]
  const tutorWallet: any = (
    await payload.find({ collection: 'wallets', where: { user: { equals: tutorUserId } }, limit: 1, depth: 0, overrideAccess: true })
  ).docs[0]
  if (!bookerWallet || !tutorWallet) return { ok: false, status: 400, error: 'Wallet not found.' }

  const willComplete = alreadyReleased + share >= price

  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) return { ok: false, status: 500, error: 'Could not process atomically.' }
  const req = { transactionID } as any
  try {
    await payload.create({
      collection: 'transactions',
      data: {
        reference,
        gateway: 'wallet',
        type: 'payout',
        sender: numericId(bookerUserId),
        receiver: numericId(tutorUserId),
        tutor: numericId(tutorUserId),
        relatedBooking: numericId(bookingId),
        relatedLiveSession: numericId(sessionId),
        amount: share,
        currency,
        status: 'success',
        description: 'Escrow released to tutor for a completed session',
      } as any,
      req,
      overrideAccess: true,
    })

    // Booker: the released funds leave the wallet entirely (total + reserved down).
    const bFresh: any = await payload.findByID({ collection: 'wallets', id: bookerWallet.id, depth: 0, overrideAccess: true, req }).catch(() => null)
    const bBal = Number(bFresh?.balance ?? bookerWallet.balance) || 0
    const bLocked = Number(bFresh?.lockedBalance ?? bookerWallet.lockedBalance) || 0
    await payload.update({
      collection: 'wallets',
      id: bookerWallet.id,
      data: { balance: Math.max(0, bBal - share), lockedBalance: Math.max(0, bLocked - share) } as any,
      req,
      overrideAccess: true,
    })

    // Tutor: earns the released funds (spendable).
    const tFresh: any = await payload.findByID({ collection: 'wallets', id: tutorWallet.id, depth: 0, overrideAccess: true, req }).catch(() => null)
    const tBal = Number(tFresh?.balance ?? tutorWallet.balance) || 0
    await payload.update({
      collection: 'wallets',
      id: tutorWallet.id,
      data: { balance: tBal + share } as any,
      req,
      overrideAccess: true,
    })

    if (willComplete) {
      await payload.update({
        collection: 'bookings',
        id: bookingId,
        data: { paymentStatus: 'paid', status: 'completed' } as any,
        req,
        overrideAccess: true,
      })
    }

    await payload.db.commitTransaction(transactionID)
    return { ok: true, held: false }
  } catch (e: any) {
    await payload.db.rollbackTransaction(transactionID)
    if (isDupRef(e)) return { ok: true, alreadyHeld: true }
    return { ok: false, status: 500, error: e?.message || 'Escrow payout failed.' }
  }
}

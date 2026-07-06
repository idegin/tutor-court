import type { Payload } from 'payload'

/**
 * Booking escrow: move a booker's funds into their wallet's `lockedBalance`,
 * flip `booking.paymentStatus` to `held`, and record a linked `payment`
 * transaction — all atomically (a DB transaction) and idempotently (the unique
 * `transactions.reference` guards against double-holds / webhook retries).
 *
 * Funds are held in the BOOKER's own wallet until the engagement completes,
 * at which point a later "release" step (Stage 4/7) transfers them to the tutor.
 */

const idOf = (rel: any): string | number | null =>
  rel == null ? null : typeof rel === 'object' ? rel.id : rel

const numericId = (v: any): string | number =>
  typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v

export interface HoldEscrowParams {
  payload: Payload
  bookingId: string | number
  source: 'wallet' | 'paystack'
  /** Idempotency key. Wallet: deterministic per booking. Paystack: the gateway reference. */
  reference: string
  /** Raw gateway payload to store on the transaction (Paystack verify/webhook data). */
  metadata?: any
}

export interface HoldEscrowResult {
  ok: boolean
  status?: number
  error?: string
  /** Amount still needed (wallet source, insufficient funds). */
  shortfall?: number
  alreadyHeld?: boolean
  held?: boolean
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
    booking = await payload.findByID({
      collection: 'bookings',
      id: bookingId,
      depth: 2,
      overrideAccess: true,
    })
  } catch {
    return { ok: false, status: 404, error: 'Booking not found.' }
  }
  if (!booking) return { ok: false, status: 404, error: 'Booking not found.' }

  if (booking.status !== 'confirmed') {
    return { ok: false, status: 409, error: 'Only a confirmed booking can be paid.' }
  }
  // Already funded — idempotent success.
  if (booking.paymentStatus === 'held' || booking.paymentStatus === 'paid') {
    return { ok: true, alreadyHeld: true }
  }

  // A transaction with this reference already exists → this hold was already
  // processed (e.g. duplicate webhook). Treat as success.
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

  const price = Number(booking.price) || 0
  const currency = booking.currency || 'ngn'

  const walletRes = await payload.find({
    collection: 'wallets',
    where: { user: { equals: bookerUserId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const wallet = walletRes.docs[0] as any
  if (!wallet) return { ok: false, status: 400, error: 'Wallet not found for booker.' }

  const balance = Number(wallet.balance) || 0
  const locked = Number(wallet.lockedBalance) || 0

  if (source === 'wallet') {
    const available = balance - locked
    if (available < price) {
      return {
        ok: false,
        status: 400,
        error: 'Insufficient wallet balance.',
        shortfall: Math.max(0, price - available),
      }
    }
  }

  // Atomic: transaction + wallet move + booking flip commit together or not at all.
  const transactionID = (await payload.db.beginTransaction()) || undefined
  const req = transactionID ? ({ transactionID } as any) : undefined
  try {
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

    // Wallet source: move spendable → locked. Paystack source: the funds arrive
    // fresh from the gateway and go straight into locked (never spendable).
    const walletData =
      source === 'wallet'
        ? { balance: balance - price, lockedBalance: locked + price }
        : { lockedBalance: locked + price }
    await payload.update({
      collection: 'wallets',
      id: wallet.id,
      data: walletData as any,
      req,
      overrideAccess: true,
    })

    await payload.update({
      collection: 'bookings',
      id: bookingId,
      data: { paymentStatus: 'held', transaction: txn.id } as any,
      req,
      overrideAccess: true,
    })

    if (transactionID) await payload.db.commitTransaction(transactionID)
    return { ok: true, held: true }
  } catch (e: any) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    // Unique-reference violation → a concurrent request already held it.
    const msg = String(e?.message || '')
    if (e?.code === '23505' || /reference/i.test(msg) || /unique/i.test(msg)) {
      return { ok: true, alreadyHeld: true }
    }
    return { ok: false, status: 500, error: e?.message || 'Escrow hold failed.' }
  }
}

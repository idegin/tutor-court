import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { materializeClassFromBooking } from './booking-to-class'
import { countSessions } from './booking-pricing'
import { createNotification } from './notification-service'
import { emailUserById } from './transactional-email'

/** Human-friendly booker name from a depth-loaded booking (for notifications). */
function bookerDisplayName(booking: any): string {
  const u =
    booking?.parent && typeof booking.parent === 'object'
      ? booking.parent
      : typeof booking?.student === 'object'
        ? booking.student
        : null
  const name = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : ''
  return name || 'A learner'
}

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

/**
 * Raw SQL executor bound to the caller's Payload transaction (falls back to the
 * pool if there is none). Payload's Postgres adapter stashes the tx-bound
 * drizzle at `db.sessions[transactionID].db`; using it keeps our relative wallet
 * updates atomic WITH the surrounding ledger/booking writes.
 */
function txExec(payload: Payload, req: any): (statement: any) => Promise<any> {
  const adapter: any = payload.db
  const id = req?.transactionID
  const db = (id != null && adapter.sessions?.[id]?.db) || adapter.drizzle
  return (statement: any) => db.execute(statement)
}

/**
 * Atomically move up to `amount` minor units from a booker's escrow (balance +
 * lockedBalance) to a tutor's balance, in ONE statement. The moved amount is
 * derived from the booker's LIVE lockedBalance (`LEAST(amount, locked)`), so
 * overlapping payouts (drip vs release vs cron) serialize on the row and can
 * never move more than what is actually locked — no lost update, no money
 * creation. Returns the amount actually moved. Runs inside the caller's tx.
 */
async function moveEscrowToTutorAtomic(
  payload: Payload,
  req: any,
  bookerWalletId: any,
  tutorWalletId: any,
  amount: number,
): Promise<number> {
  if (!(amount > 0)) return 0
  const exec = txExec(payload, req)
  const res: any = await exec(sql`
    WITH d AS (
      SELECT LEAST(${amount}, GREATEST(0, w."locked_balance")) AS pay
      FROM "wallets" w WHERE w."id" = ${bookerWalletId}
    ),
    ub AS (
      UPDATE "wallets"
      SET "balance" = "balance" - (SELECT pay FROM d),
          "locked_balance" = "locked_balance" - (SELECT pay FROM d)
      WHERE "id" = ${bookerWalletId} AND (SELECT pay FROM d) > 0
      RETURNING 1
    ),
    ut AS (
      UPDATE "wallets"
      SET "balance" = "balance" + (SELECT pay FROM d)
      WHERE "id" = ${tutorWalletId} AND EXISTS (SELECT 1 FROM ub)
      RETURNING 1
    )
    SELECT COALESCE((SELECT pay FROM d), 0) AS pay
  `)
  return Number(res?.rows?.[0]?.pay) || 0
}

/**
 * Atomically unlock up to `amount` of a booker's reserved funds (refund to
 * spendable — the money stays in the wallet, only the reservation drops).
 * Returns the amount actually unlocked. Runs inside the caller's tx.
 */
export async function unlockEscrowAtomic(payload: Payload, req: any, walletId: any, amount: number): Promise<number> {
  if (!(amount > 0)) return 0
  const exec = txExec(payload, req)
  const res: any = await exec(sql`
    WITH d AS (
      SELECT LEAST(${amount}, GREATEST(0, w."locked_balance")) AS amt
      FROM "wallets" w WHERE w."id" = ${walletId}
    ),
    u AS (
      UPDATE "wallets" SET "locked_balance" = "locked_balance" - (SELECT amt FROM d)
      WHERE "id" = ${walletId} AND (SELECT amt FROM d) > 0
      RETURNING 1
    )
    SELECT COALESCE((SELECT amt FROM d), 0) AS amt
  `)
  return Number(res?.rows?.[0]?.amt) || 0
}

/**
 * Atomically reserve `amount` (lockedBalance += amount) only if the LIVE
 * spendable balance (balance − lockedBalance) covers it. Returns true iff
 * reserved — so two concurrent reservations can't both pass a stale check and
 * over-reserve. Runs inside the caller's tx.
 */
export async function reserveLockedAtomic(payload: Payload, req: any, walletId: any, amount: number): Promise<boolean> {
  if (!(amount > 0)) return true
  const exec = txExec(payload, req)
  const res: any = await exec(sql`
    WITH d AS (
      SELECT (("balance" - "locked_balance") >= ${amount}) AS ok FROM "wallets" WHERE "id" = ${walletId}
    ),
    u AS (
      UPDATE "wallets" SET "locked_balance" = "locked_balance" + ${amount}
      WHERE "id" = ${walletId} AND (SELECT ok FROM d)
      RETURNING 1
    )
    SELECT COALESCE((SELECT ok FROM d), false) AS ok
  `)
  return Boolean(res?.rows?.[0]?.ok)
}

/** Atomically add `amount` to a wallet's total balance (relative — no stale read-then-write). Runs inside caller's tx. */
export async function creditWalletAtomic(payload: Payload, req: any, walletId: any, amount: number): Promise<void> {
  if (!(amount > 0)) return
  await txExec(payload, req)(sql`UPDATE "wallets" SET "balance" = "balance" + ${amount} WHERE "id" = ${walletId}`)
}

/**
 * Atomically spend spendable balance to buy live-class credits: debit `cost`
 * from balance and add `credits` to creditBalance, only if live spendable
 * (balance − lockedBalance) covers the cost. Returns whether it applied plus the
 * new balances. Prevents double-spend of the same funds. Runs inside caller's tx.
 */
export async function spendBalanceForCreditsAtomic(
  payload: Payload,
  req: any,
  walletId: any,
  cost: number,
  credits: number,
): Promise<{ ok: boolean; balance: number; creditBalance: number }> {
  const exec = txExec(payload, req)
  const res: any = await exec(sql`
    WITH d AS (
      SELECT (("balance" - "locked_balance") >= ${cost}) AS ok FROM "wallets" WHERE "id" = ${walletId}
    ),
    u AS (
      UPDATE "wallets"
      SET "balance" = "balance" - ${cost}, "credit_balance" = "credit_balance" + ${credits}
      WHERE "id" = ${walletId} AND (SELECT ok FROM d)
      RETURNING "balance", "credit_balance"
    )
    SELECT COALESCE((SELECT ok FROM d), false) AS ok,
           (SELECT "balance" FROM u) AS balance,
           (SELECT "credit_balance" FROM u) AS credit_balance
  `)
  const row = res?.rows?.[0]
  return { ok: Boolean(row?.ok), balance: Number(row?.balance) || 0, creditBalance: Number(row?.credit_balance) || 0 }
}

/**
 * Atomically debit a wallet's total balance AND drop its reservation by
 * `amount` — but only if the live balance covers it. Returns true iff applied.
 * Used for tutor withdrawals so a concurrent escrow credit can't be lost to a
 * stale read-then-write. Runs inside the caller's tx.
 */
export async function debitWalletAtomic(payload: Payload, req: any, walletId: any, amount: number): Promise<boolean> {
  if (!(amount > 0)) return true
  const exec = txExec(payload, req)
  const res: any = await exec(sql`
    WITH d AS (
      SELECT ("balance" >= ${amount}) AS ok FROM "wallets" WHERE "id" = ${walletId}
    ),
    u AS (
      UPDATE "wallets"
      SET "balance" = "balance" - ${amount},
          "locked_balance" = GREATEST(0, "locked_balance" - ${amount})
      WHERE "id" = ${walletId} AND (SELECT ok FROM d)
      RETURNING 1
    )
    SELECT COALESCE((SELECT ok FROM d), false) AS ok
  `)
  return Boolean(res?.rows?.[0]?.ok)
}

/**
 * True if the booking has an OPEN dispute. While a dispute is open the escrow is
 * frozen — no per-session payout and no tutor "mark complete" — so money can't
 * leave until an admin resolves it (refund to booker or release to tutor).
 */
export async function hasOpenDispute(payload: Payload, bookingId: string | number): Promise<boolean> {
  try {
    const res = await payload.find({
      collection: 'disputes',
      where: { and: [{ booking: { equals: bookingId } }, { status: { equals: 'open' } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return res.totalDocs > 0
  } catch {
    return false
  }
}

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

    // Reserve atomically with relative updates so two concurrent holds on the
    // same wallet can't both pass a stale spendable check and over-reserve.
    if (source === 'wallet') {
      const reserved = await reserveLockedAtomic(payload, req, fresh.id, price)
      if (!reserved) {
        await payload.db.rollbackTransaction(transactionID)
        return { ok: false, status: 400, error: 'Insufficient wallet balance.', shortfall: Math.max(0, price - (balance - locked)) }
      }
    } else {
      // Fresh gateway funds: add to total AND reserve.
      await txExec(payload, req)(sql`
        UPDATE "wallets" SET "balance" = "balance" + ${price}, "locked_balance" = "locked_balance" + ${price}
        WHERE "id" = ${fresh.id}
      `)
    }

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

    // Notify the tutor that the booking is funded — for EVERY funding source
    // (wallet pay, Paystack verify, Paystack webhook), so a gateway-funded
    // booking isn't silently un-announced.
    if (tutorUserId) {
      const bookerName = bookerDisplayName(booking)
      await createNotification({
        recipientId: String(tutorUserId),
        type: 'payment_received',
        title: 'Booking funded',
        message: `${bookerName} paid for their booking — funds are held in escrow.`,
        link: '/dashboard/tutor/bookings',
        relatedCollection: 'bookings',
        relatedId: String(bookingId),
      }).catch(() => {})
      await emailUserById(
        payload,
        tutorUserId,
        'A booking was funded - TutorCourt',
        'Booking funded',
        `<p class="text">Good news — <strong>${bookerName}</strong> funded their booking. The payment is held securely in escrow and released to you after the sessions.</p>`,
        { link: '/dashboard/tutor/bookings', linkLabel: 'View booking' },
      ).catch(() => {})
    }

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
  amount,
  reference,
  userId,
  currency,
  metadata,
  note,
}: {
  payload: Payload
  walletId: string | number
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
    // Relative credit — atomic at the row level, so a concurrent credit can't
    // clobber this one (no stale read-then-write).
    await txExec(payload, req)(sql`
      UPDATE "wallets" SET "balance" = "balance" + ${amount} WHERE "id" = ${walletId}
    `)
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
    // Only the STILL-HELD portion is refundable — any per-session drips already
    // paid to the tutor are gone. Refunding `price` would over-unlock a shared
    // wallet and overstate the refund in the ledger.
    const relRes = await payload.find({
      collection: 'transactions',
      where: { and: [{ relatedBooking: { equals: bookingId } }, { type: { equals: 'payout' } }] },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const alreadyReleased = relRes.docs.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0)
    const refundable = Math.max(0, price - alreadyReleased)

    // Unlock atomically (clamped to live locked) and record the ACTUAL amount.
    const refunded = await unlockEscrowAtomic(payload, req, wallet.id, refundable)

    await payload.create({
      collection: 'transactions',
      data: {
        reference,
        gateway: 'wallet',
        type: 'refund',
        sender: numericId(bookerUserId),
        receiver: numericId(bookerUserId),
        relatedBooking: numericId(bookingId),
        amount: refunded,
        currency,
        status: 'success',
        description: 'Booking cancelled — escrow released to wallet',
      } as any,
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

  // Once the tutor has marked work delivered, the remaining escrow is the
  // booker's to release (or the grace-window cron's) — do NOT keep dripping it
  // to the tutor, which would bypass the payer's release decision.
  if (booking.status === 'awaiting_release') return { ok: true, held: true, skipped: true }

  // Freeze payouts while a dispute is open — money stays in escrow until an
  // admin resolves it.
  if (await hasOpenDispute(payload, bookingId)) return { ok: true, held: true, skipped: true }

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

  const bookerWallet: any = (
    await payload.find({ collection: 'wallets', where: { user: { equals: bookerUserId } }, limit: 1, depth: 0, overrideAccess: true })
  ).docs[0]
  const tutorWallet: any = (
    await payload.find({ collection: 'wallets', where: { user: { equals: tutorUserId } }, limit: 1, depth: 0, overrideAccess: true })
  ).docs[0]
  if (!bookerWallet || !tutorWallet) return { ok: false, status: 400, error: 'Wallet not found.' }

  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) return { ok: false, status: 500, error: 'Could not process atomically.' }
  const req = { transactionID } as any
  try {
    // Re-read the released total INSIDE the transaction so concurrent session
    // ends can't over-release (narrows the TOCTOU window).
    const relRes = await payload.find({
      collection: 'transactions',
      where: { and: [{ relatedBooking: { equals: bookingId } }, { type: { equals: 'payout' } }] },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const alreadyReleased = relRes.docs.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0)
    const remaining = Math.max(0, price - alreadyReleased)
    // On the last planned session (or when the drip would otherwise leave dust),
    // release the EXACT remainder so nothing stays locked and the booking
    // actually completes.
    const isLastPlanned = relRes.docs.length + 1 >= totalSessions
    const requested = isLastPlanned ? remaining : Math.min(Math.round(price / totalSessions), remaining)

    if (requested <= 0) {
      // Already fully released — just ensure the booking + class read as complete.
      await payload
        .update({ collection: 'bookings', id: bookingId, data: { paymentStatus: 'paid', status: 'completed' } as any, req, overrideAccess: true })
        .catch(() => {})
      await payload
        .update({ collection: 'classes', id: classId, data: { status: 'completed' } as any, req, overrideAccess: true })
        .catch(() => {})
      await payload.db.commitTransaction(transactionID)
      return { ok: true }
    }

    // Move the session's share booker → tutor in ONE atomic statement, clamped to
    // the booker's LIVE locked balance. This is the money-safety guarantee: even
    // if a concurrent completion/drip raced past the `alreadyReleased` read, we
    // can never move more than what is actually locked (no over-release / money
    // creation), and the tutor is credited EXACTLY what left the booker.
    const share = await moveEscrowToTutorAtomic(payload, req, bookerWallet.id, tutorWallet.id, requested)

    if (share > 0) {
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
    }

    const willComplete = alreadyReleased + share >= price
    if (willComplete) {
      await payload.update({
        collection: 'bookings',
        id: bookingId,
        data: { paymentStatus: 'paid', status: 'completed' } as any,
        req,
        overrideAccess: true,
      })
      // A fully-paid class is done — mark it completed so it can't be re-started
      // (and won't fall through to the SaaS credit gate).
      await payload
        .update({ collection: 'classes', id: classId, data: { status: 'completed' } as any, req, overrideAccess: true })
        .catch(() => {})
    }

    await payload.db.commitTransaction(transactionID)
    return { ok: true, held: false }
  } catch (e: any) {
    await payload.db.rollbackTransaction(transactionID)
    if (isDupRef(e)) return { ok: true, alreadyHeld: true }
    return { ok: false, status: 500, error: e?.message || 'Escrow payout failed.' }
  }
}

/**
 * Stage 7 — explicit completion: release ALL remaining held escrow for a booking
 * to the tutor and mark the booking paid/completed + its class completed. This is
 * the guarantee that a marketplace engagement always settles (even if sessions
 * were never formally ended). Idempotent (`payout-complete-{bookingId}`).
 */
export async function releaseRemainingEscrowToTutor({
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
  if (booking.paymentStatus === 'paid') return { ok: true, alreadyHeld: true } // already settled
  if (booking.paymentStatus !== 'held') return { ok: false, status: 409, error: 'Booking is not funded.' }

  const price = Number(booking.price) || 0
  const currency = booking.currency || 'ngn'
  const bookerUserId = booking.parent ? idOf(booking.parent) : idOf(booking.student)
  const tutorUserId =
    booking.tutor && typeof booking.tutor === 'object' ? idOf(booking.tutor.user) : null
  const classId = idOf(booking.class)
  if (!bookerUserId || !tutorUserId) return { ok: false, status: 400, error: 'Could not resolve booker/tutor.' }

  const reference = `payout-complete-${bookingId}`
  const existing = await payload.find({ collection: 'transactions', where: { reference: { equals: reference } }, limit: 1, depth: 0, overrideAccess: true })
  if (existing.totalDocs > 0) return { ok: true, alreadyHeld: true }

  const bookerWallet: any = (await payload.find({ collection: 'wallets', where: { user: { equals: bookerUserId } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const tutorWallet: any = (await payload.find({ collection: 'wallets', where: { user: { equals: tutorUserId } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!bookerWallet || !tutorWallet) return { ok: false, status: 400, error: 'Wallet not found.' }

  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) return { ok: false, status: 500, error: 'Could not process atomically.' }
  const req = { transactionID } as any
  try {
    const relRes = await payload.find({
      collection: 'transactions',
      where: { and: [{ relatedBooking: { equals: bookingId } }, { type: { equals: 'payout' } }] },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const alreadyReleased = relRes.docs.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0)
    const requested = Math.max(0, price - alreadyReleased)

    // Move the remaining escrow booker → tutor atomically, clamped to the
    // booker's LIVE locked balance. Records the ACTUAL amount moved, so a
    // concurrent per-session drip that raced past the `alreadyReleased` read
    // cannot be double-counted into money creation.
    const remaining = await moveEscrowToTutorAtomic(payload, req, bookerWallet.id, tutorWallet.id, requested)

    if (remaining > 0) {
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
          amount: remaining,
          currency,
          status: 'success',
          description: 'Escrow released to tutor on engagement completion',
        } as any,
        req,
        overrideAccess: true,
      })
    }

    await payload.update({ collection: 'bookings', id: bookingId, data: { paymentStatus: 'paid', status: 'completed' } as any, req, overrideAccess: true })
    if (classId) {
      await payload.update({ collection: 'classes', id: classId, data: { status: 'completed' } as any, req, overrideAccess: true }).catch(() => {})
    }

    await payload.db.commitTransaction(transactionID)
    return { ok: true, held: false }
  } catch (e: any) {
    await payload.db.rollbackTransaction(transactionID)
    if (isDupRef(e)) return { ok: true, alreadyHeld: true }
    return { ok: false, status: 500, error: e?.message || 'Escrow completion payout failed.' }
  }
}

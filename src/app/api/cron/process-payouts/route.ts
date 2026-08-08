import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { initiateTransfer, verifyTransfer } from '@/lib/paystack'
import { markWithdrawalPaid, reverseWithdrawal } from '@/lib/payout'

/**
 * Cron: drive approved tutor withdrawals through Paystack Transfers, decoupled
 * from the approval DB transaction (never call an external payment API inside a
 * transaction). For each `paid` + `transferStatus='processing'` request:
 *   - not yet sent (no transferCode) → initiate an idempotent transfer
 *     (reference `withdrawal-{id}`; Paystack returns the existing one on retry).
 *   - already sent → verify and finalize (success → paid; failed/reversed →
 *     re-credit the wallet). This also self-heals transfers whose webhook never
 *     arrived.
 *
 * Protect with CRON_SECRET (Bearer). Schedule every few minutes (QStash / Vercel
 * Pro) — see scripts/setup-qstash-schedules.ts.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 })
  const provided = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (provided !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await getPayload({ config })

  const due = await payload.find({
    collection: 'payout-requests',
    where: {
      and: [
        { status: { equals: 'paid' } },
        { transferStatus: { equals: 'processing' } },
        { recipientCode: { exists: true } },
      ],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  const result = { scanned: due.totalDocs, initiated: 0, paid: 0, reversed: 0, pending: 0, failed: 0 }

  for (const req of due.docs as any[]) {
    const reference = req.transferReference || `withdrawal-${req.id}`
    try {
      if (!req.transferCode) {
        // Not yet sent → initiate (idempotent by reference).
        const transfer = await initiateTransfer({
          amountNaira: Number(req.amount) || 0,
          recipientCode: req.recipientCode,
          reference,
          reason: 'Tutor withdrawal',
        })
        await payload.update({
          collection: 'payout-requests',
          id: req.id,
          data: { transferCode: transfer.transferCode || 'initiated' } as any,
          overrideAccess: true,
        })
        result.initiated++
        if (transfer.status === 'success') {
          await markWithdrawalPaid(payload, req)
          result.paid++
        } else if (transfer.status === 'failed' || transfer.status === 'reversed') {
          await reverseWithdrawal(payload, req)
          result.reversed++
        } else {
          result.pending++
        }
      } else {
        // Already sent → verify + finalize (heals a missing webhook).
        const v = await verifyTransfer(reference)
        if (v?.status === 'success') {
          await markWithdrawalPaid(payload, req)
          result.paid++
        } else if (v?.status === 'failed' || v?.status === 'reversed') {
          await reverseWithdrawal(payload, req)
          result.reversed++
        } else {
          result.pending++
        }
      }
    } catch (e: any) {
      result.failed++
      payload.logger?.error?.(`[cron/process-payouts] request ${req.id} failed: ${e?.message}`)
    }
  }

  return NextResponse.json({ ok: true, ...result })
}

export const GET = handle
export const POST = handle

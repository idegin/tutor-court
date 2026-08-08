/**
 * Thin Paystack REST helpers for tutor payouts (NGN):
 *   - listBanks:            GET /bank?currency=NGN
 *   - resolveAccount:       GET /bank/resolve  (account number → real name)
 *   - createTransferRecipient: POST /transferrecipient (nuban)
 *   - initiateTransfer:     POST /transfer (source=balance)
 *
 * All calls use PAYSTACK_SECRET_KEY. Amounts are in kobo (minor units) at the
 * Paystack boundary; the rest of the app stores Naira, so callers convert.
 */

const PAYSTACK_BASE = 'https://api.paystack.co'

function secret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured.')
  return key
}

async function psFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.status === false) {
    throw new Error(json?.message || `Paystack request failed (${res.status}).`)
  }
  return json
}

export interface PaystackBank {
  name: string
  code: string
  currency: string
}

export async function listBanks(currency = 'NGN'): Promise<PaystackBank[]> {
  const json = await psFetch(`/bank?currency=${encodeURIComponent(currency)}`)
  return (json?.data || []).map((b: any) => ({ name: b.name, code: b.code, currency: b.currency }))
}

export interface ResolvedAccount {
  accountNumber: string
  accountName: string
}

export async function resolveAccount(accountNumber: string, bankCode: string): Promise<ResolvedAccount> {
  const json = await psFetch(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
  )
  return { accountNumber: json?.data?.account_number, accountName: json?.data?.account_name }
}

export interface TransferRecipient {
  recipientCode: string
  accountName: string
  bankName: string
}

export async function createTransferRecipient(params: {
  accountName: string
  accountNumber: string
  bankCode: string
  currency?: string
}): Promise<TransferRecipient> {
  const json = await psFetch('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nuban',
      name: params.accountName,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: params.currency || 'NGN',
    }),
  })
  return {
    recipientCode: json?.data?.recipient_code,
    accountName: json?.data?.details?.account_name || params.accountName,
    bankName: json?.data?.details?.bank_name || '',
  }
}

export interface TransferResult {
  reference: string
  transferCode: string
  status: string
}

export async function initiateTransfer(params: {
  amountNaira: number
  recipientCode: string
  reference: string
  reason?: string
}): Promise<TransferResult> {
  const json = await psFetch('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(params.amountNaira * 100), // kobo
      recipient: params.recipientCode,
      reference: params.reference,
      reason: params.reason || 'Tutor withdrawal',
    }),
  })
  return {
    reference: json?.data?.reference || params.reference,
    transferCode: json?.data?.transfer_code,
    status: json?.data?.status,
  }
}

/**
 * Verify a transfer by our reference. Used to reconcile transfers whose webhook
 * never arrived. Returns null if Paystack has no record of it yet.
 */
export async function verifyTransfer(reference: string): Promise<{ status: string } | null> {
  try {
    const json = await psFetch(`/transfer/verify/${encodeURIComponent(reference)}`)
    return { status: json?.data?.status }
  } catch {
    return null
  }
}

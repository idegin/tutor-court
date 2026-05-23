import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const amount = Number(body?.amount)
  const callbackUrl = body?.callbackUrl

  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Valid amount is required.' }, { status: 400 })
  }

  if (!callbackUrl) {
    return NextResponse.json({ error: 'Callback URL is required.' }, { status: 400 })
  }

  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      return NextResponse.json({ error: 'Paystack is not configured.' }, { status: 500 })
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100), // convert to kobo
        callback_url: callbackUrl,
        metadata: {
          userId: user.id,
          purpose: 'wallet_funding',
        },
      }),
    })

    const data = await paystackRes.json()
    if (!paystackRes.ok || !data.status) {
      return NextResponse.json({ error: data.message || 'Paystack initialization failed.' }, { status: 400 })
    }

    return NextResponse.json({ authorizationUrl: data.data.authorization_url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

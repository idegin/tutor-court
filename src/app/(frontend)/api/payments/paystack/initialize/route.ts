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

  const callbackUrl = body?.callbackUrl
  const bookingId = body?.bookingId

  if (!callbackUrl) {
    return NextResponse.json({ error: 'Callback URL is required.' }, { status: 400 })
  }

  // Two purposes: fund the wallet, or pay a specific booking directly into
  // escrow. For a booking the amount is authoritative (the booking price).
  let amount: number
  let metadata: Record<string, any> = { userId: user.id, purpose: 'wallet_funding' }

  if (bookingId) {
    let booking: any
    try {
      booking = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 0, overrideAccess: true })
    } catch {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    const isBooker =
      String(typeof booking.student === 'object' ? booking.student?.id : booking.student) === String(user.id) ||
      String(typeof booking.parent === 'object' ? booking.parent?.id : booking.parent) === String(user.id)
    if (!isBooker) {
      return NextResponse.json({ error: 'You are not the booker of this booking.' }, { status: 403 })
    }
    if (booking.status !== 'confirmed' || booking.paymentStatus !== 'unpaid') {
      return NextResponse.json({ error: 'This booking is not awaiting payment.' }, { status: 409 })
    }
    amount = Number(booking.price) || 0
    metadata = { userId: user.id, purpose: 'booking_escrow', bookingId: String(bookingId) }
  } else {
    amount = Number(body?.amount)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required.' }, { status: 400 })
    }
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
        metadata,
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

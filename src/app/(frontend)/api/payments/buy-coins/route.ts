import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'This route has been moved to /api/payments/buy-credits' }, { status: 308 })
}

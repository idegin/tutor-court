import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { COIN_RATE } from '@/lib/constants'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can end live classes.' }, { status: 403 })
  }

  const { id } = params

  try {
    const session = await payload.findByID({
      collection: 'live-sessions',
      id,
      depth: 0,
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    if (session.status === 'ended') {
      return NextResponse.json({ error: 'Session already ended.' }, { status: 400 })
    }

    const startedTime = new Date(session.startedAt || session.createdAt).getTime()
    const endedTime = Date.now()
    const durationMs = endedTime - startedTime
    const durationMinutes = Math.max(1, Math.ceil(durationMs / (1000 * 60)))
    const cost = durationMinutes * COIN_RATE.coinsPerMinute

    // Find tutor wallet
    const wallets = await payload.find({
      collection: 'wallets',
      where: { user: { equals: session.tutor } },
      limit: 1,
      depth: 0,
    })

    if (wallets.docs.length > 0) {
      const wallet = wallets.docs[0]
      const currentCoinBalance = (wallet.coinBalance as number) || 0
      const newCoinBalance = Math.max(0, currentCoinBalance - cost)

      // Update wallet
      await payload.update({
        collection: 'wallets',
        id: wallet.id,
        data: {
          coinBalance: newCoinBalance,
        } as any,
      })

      // Create transaction record for coin consumption (NGN value is cost * nairaPerCoin)
      await payload.create({
        collection: 'transactions',
        data: {
          sender: session.tutor,
          receiver: session.tutor,
          amount: cost * COIN_RATE.nairaPerCoin,
          currency: 'ngn',
          status: 'paid',
        } as any,
      })
    }

    // Update live session status
    const updatedSession = await payload.update({
      collection: 'live-sessions',
      id: session.id,
      data: {
        endedAt: new Date(endedTime).toISOString(),
        status: 'ended',
        coinsConsumed: cost,
        durationMinutes,
      } as any,
    })

    return NextResponse.json({ success: true, session: updatedSession })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

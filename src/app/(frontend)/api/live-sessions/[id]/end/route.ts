import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CREDIT_RATE } from '@/lib/constants'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
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
    const endedIso = new Date(endedTime).toISOString()
    const durationMs = endedTime - startedTime
    const sessionDurationMinutes = Math.max(1, Math.ceil(durationMs / (1000 * 60)))

    // 1. Close/End all active participant logs for this session
    const activeParticipants = await payload.find({
      collection: 'live-session-participants',
      where: {
        and: [{ liveSession: { equals: session.id } }, { leftAt: { exists: false } }],
      },
      limit: 1000,
      depth: 0,
    })

    for (const log of activeParticipants.docs as any[]) {
      const logJoinedTime = new Date(log.joinedAt).getTime()
      const logDurationSeconds = Math.max(0, Math.floor((endedTime - logJoinedTime) / 1000))

      await payload.update({
        collection: 'live-session-participants',
        id: log.id,
        data: {
          leftAt: endedIso,
          durationSeconds: logDurationSeconds,
        } as any,
      })
    }

    // 2. Close/End all active student Attendance records for this session
    const activeAttendance = await payload.find({
      collection: 'attendance',
      where: {
        and: [{ liveSession: { equals: session.id } }, { leftAt: { exists: false } }],
      },
      limit: 1000,
      depth: 0,
    })

    for (const att of activeAttendance.docs as any[]) {
      const attJoinedTime = new Date(att.joinedAt).getTime()
      const attDurationMinutes = Math.max(1, Math.ceil((endedTime - attJoinedTime) / (1000 * 60)))

      await payload.update({
        collection: 'attendance',
        id: att.id,
        data: {
          leftAt: endedIso,
          durationMinutes: attDurationMinutes,
        } as any,
      })
    }

    // 3. Compute cost based on additional participants (students & parents)
    const participantLogs = await payload.find({
      collection: 'live-session-participants',
      where: {
        and: [
          { liveSession: { equals: session.id } },
          { accountType: { in: ['student', 'parent'] } },
        ],
      },
      limit: 1000,
      depth: 0,
    })

    let totalParticipantMinutes = 0
    for (const log of participantLogs.docs as any[]) {
      const logJoined = new Date(log.joinedAt).getTime()
      const logLeft = log.leftAt ? new Date(log.leftAt).getTime() : endedTime
      const logDurationMs = logLeft - logJoined
      const logDurationMinutes = Math.max(1, Math.ceil(logDurationMs / (1000 * 60)))
      totalParticipantMinutes += logDurationMinutes
    }

    // If no students/parents joined, charge a baseline of 1 credit/min of tutor's session duration.
    // Otherwise, charge based on the total student/parent participant minutes.
    const billableMinutes =
      totalParticipantMinutes > 0 ? totalParticipantMinutes : sessionDurationMinutes
    const cost = billableMinutes * CREDIT_RATE.coinsPerMinute

    // Find tutor wallet
    const wallets = await payload.find({
      collection: 'wallets',
      where: { user: { equals: session.tutor } },
      limit: 1,
      depth: 0,
    })

    if (wallets.docs.length > 0) {
      const wallet = wallets.docs[0]
      const currentCoinBalance = (wallet.creditBalance as number) || 0
      const newCoinBalance = Math.max(0, currentCoinBalance - cost)

      // Update wallet
      await payload.update({
        collection: 'wallets',
        id: wallet.id,
        data: {
          creditBalance: newCoinBalance,
        } as any,
      })

      // Create transaction record for credit consumption (NGN value is cost * nairaPerCoin)
      await payload.create({
        collection: 'transactions',
        data: {
          sender: session.tutor,
          receiver: session.tutor,
          amount: cost * CREDIT_RATE.nairaPerCoin,
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
        endedAt: endedIso,
        status: 'ended',
        coinsConsumed: cost,
        durationMinutes: sessionDurationMinutes,
      } as any,
    })

    return NextResponse.json({ success: true, session: updatedSession })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

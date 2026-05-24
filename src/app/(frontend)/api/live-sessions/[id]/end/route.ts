import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CREDIT_RATE } from '@/lib/constants'
import { createActivityLogs } from '@/lib/activity-log-service'

function deriveEngagementFlag(
  attendanceMinutes: number,
  sessionMinutes: number,
): 'good' | 'partial' | 'poor' | 'absent' {
  if (attendanceMinutes <= 0) return 'absent'
  if (sessionMinutes <= 0) return 'good'
  const ratio = attendanceMinutes / sessionMinutes
  if (ratio >= 0.8) return 'good'
  if (ratio >= 0.4) return 'partial'
  return 'poor'
}

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
          engagementFlag: deriveEngagementFlag(attDurationMinutes, sessionDurationMinutes),
        } as any,
      })
    }

    // Backfill engagement flag on any earlier-closed attendance rows that
    // weren't yet flagged (so the session ending is the single source of truth).
    const closedAttendance = await payload.find({
      collection: 'attendance',
      where: {
        and: [
          { liveSession: { equals: session.id } },
          { engagementFlag: { equals: 'unknown' } },
        ],
      },
      limit: 1000,
      depth: 0,
    })
    for (const att of closedAttendance.docs as any[]) {
      await payload.update({
        collection: 'attendance',
        id: att.id,
        data: {
          engagementFlag: deriveEngagementFlag(
            Number(att.durationMinutes || 0),
            sessionDurationMinutes,
          ),
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
          reference: `session-${session.id}-${Date.now()}`,
          gateway: 'wallet',
          type: 'payment',
          sender: session.tutor,
          receiver: session.tutor,
          tutor: session.tutor,
          relatedLiveSession: session.id,
          amount: cost * CREDIT_RATE.nairaPerCoin,
          currency: 'ngn',
          status: 'success',
          description: `Live session credit consumption (${cost} credits).`,
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

    // Activity logs — write one row per participating student (subject = student)
    // plus one row for the tutor (subject = tutor), so each role's feed reflects
    // the ended session.
    try {
      const cls = await payload.findByID({
        collection: 'classes',
        id: typeof session.class === 'object' ? (session.class as any).id : session.class,
        depth: 0,
      })
      const className = (cls as any)?.title || 'the class'
      const tutorIdVal = typeof session.tutor === 'object' ? (session.tutor as any).id : session.tutor

      const studentParticipants = (participantLogs.docs as any[]).filter(
        (p) => p.accountType === 'student',
      )

      const classIdForLink =
        typeof session.class === 'object' ? (session.class as any).id : session.class

      const entries: Parameters<typeof createActivityLogs>[0] = studentParticipants.map((p) => ({
        subjectId: p.user,
        actorId: tutorIdVal,
        type: 'class_ended',
        title: `${className} ended`,
        description: `Live session ended after ${sessionDurationMinutes} minutes.`,
        link: `/dashboard/student/classes/${classIdForLink}`,
        relatedCollection: 'live-sessions',
        relatedId: String(session.id),
        metadata: { sessionDurationMinutes, classId: cls?.id },
      }))

      entries.push({
        subjectId: tutorIdVal,
        actorId: tutorIdVal,
        type: 'class_ended',
        title: `Ended ${className}`,
        description: `Session lasted ${sessionDurationMinutes} minutes with ${studentParticipants.length} student(s) attending.`,
        link: `/dashboard/tutor/classes/${classIdForLink}`,
        relatedCollection: 'live-sessions',
        relatedId: String(session.id),
        metadata: {
          sessionDurationMinutes,
          classId: cls?.id,
          studentCount: studentParticipants.length,
        },
      })

      await createActivityLogs(entries)
    } catch (logErr) {
      console.error('[live-sessions/end] Failed to write activity logs:', logErr)
    }

    return NextResponse.json({ success: true, session: updatedSession })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

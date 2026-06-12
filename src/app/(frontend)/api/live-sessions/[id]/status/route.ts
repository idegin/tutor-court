import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CREDIT_RATE } from '@/lib/constants'
import { createActivityLogs, ActivityLogEntry } from '@/lib/activity-log-service'
import { generateVideoSdkToken, isVideoSdkAvailable } from '@/lib/videosdk'

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

async function getActiveVideoSdkParticipants(roomId: string): Promise<string[] | null> {
  if (!isVideoSdkAvailable()) return null

  const token = generateVideoSdkToken()
  if (!token) return null

  try {
    const sessionsRes = await fetch(`https://api.videosdk.live/v2/sessions?roomId=${roomId}`, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    })

    if (!sessionsRes.ok) {
      console.warn(`[VideoSDK] Fetch sessions for room ${roomId} failed: ${sessionsRes.statusText}`)
      return null
    }

    const sessionsData = await sessionsRes.json()
    const sessions = sessionsData.data || []
    
    // Find active session
    const activeSession = sessions.find((s: any) => !s.end) || sessions[0]
    if (!activeSession) return []

    const sessionId = activeSession.id || activeSession.sessionId
    if (!sessionId) return []

    const participantsRes = await fetch(`https://api.videosdk.live/v2/sessions/${sessionId}/participants/active`, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    })

    if (!participantsRes.ok) {
      console.warn(`[VideoSDK] Fetch active participants for session ${sessionId} failed: ${participantsRes.statusText}`)
      return null
    }

    const participantsData = await participantsRes.json()
    const activeParticipants = participantsData.data || []
    return activeParticipants.map((p: any) => String(p.participantId))
  } catch (err) {
    console.error('[VideoSDK] Error fetching active participants:', err)
    return null
  }
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const payload = await getPayload({ config })
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
      // Report the tutor's ACTUAL remaining balance (not a hardcoded 0) so the
      // client can tell a manual "tutor ended the class" apart from an automatic
      // "out of credits" shutdown. The auto-close path drains the wallet to 0,
      // while a manual end leaves whatever credits remain.
      const endedWallets = await payload.find({
        collection: 'wallets',
        where: { user: { equals: session.tutor } },
        limit: 1,
        depth: 0,
      })
      const endedRemainingCredits = endedWallets.docs[0]
        ? Math.max(0, (endedWallets.docs[0].creditBalance as number) || 0)
        : 0

      return NextResponse.json({
        status: 'ended',
        remainingCredits: endedRemainingCredits,
        showWhiteboard: false,
        activeWhiteboard: null,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      })
    }

    // Reconcile database active participants with VideoSDK active participants
    if (session.roomId) {
      const activeVideoSdkUserIds = await getActiveVideoSdkParticipants(session.roomId)
      if (activeVideoSdkUserIds !== null) {
        const nowIso = new Date().toISOString()
        
        // Find all active database participant logs for this session
        const dbActiveLogs = await payload.find({
          collection: 'live-session-participants',
          where: {
            and: [
              { liveSession: { equals: session.id } },
              { leftAt: { exists: false } },
            ],
          },
          limit: 1000,
          depth: 0,
        })

        for (const log of dbActiveLogs.docs as any[]) {
          const userIdStr = typeof log.user === 'object' ? String(log.user.id) : String(log.user)
          
          // If user is NOT active in VideoSDK, mark them as left in the DB
          if (!activeVideoSdkUserIds.includes(userIdStr)) {
            const logJoinedTime = new Date(log.joinedAt).getTime()
            const logDurationSeconds = Math.max(0, Math.floor((Date.now() - logJoinedTime) / 1000))

            await payload.update({
              collection: 'live-session-participants',
              id: log.id,
              data: {
                leftAt: nowIso,
                durationSeconds: logDurationSeconds,
              } as any,
            })

            // Reconcile attendance record for student
            if (log.accountType === 'student') {
              const activeAttendance = await payload.find({
                collection: 'attendance',
                where: {
                  and: [
                    { liveSession: { equals: session.id } },
                    { student: { equals: userIdStr } },
                    { leftAt: { exists: false } },
                  ],
                },
                limit: 1,
                depth: 0,
              })
              const att = activeAttendance.docs[0] as any
              if (att) {
                const attJoinedTime = new Date(att.joinedAt).getTime()
                const attDurationMinutes = Math.max(1, Math.ceil((Date.now() - attJoinedTime) / (1000 * 60)))
                await payload.update({
                  collection: 'attendance',
                  id: att.id,
                  data: {
                    leftAt: nowIso,
                    durationMinutes: attDurationMinutes,
                  } as any,
                })
              }
            }
          }
        }
      }
    }

    // 1. Fetch tutor's wallet
    const wallets = await payload.find({
      collection: 'wallets',
      where: { user: { equals: session.tutor } },
      limit: 1,
      depth: 0,
    })
    const wallet = wallets.docs[0]
    const currentCreditBalance = wallet ? ((wallet.creditBalance as number) || 0) : 0

    // 2. Compute cost based on participant logs
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

    const startedTime = new Date(session.startedAt || session.createdAt).getTime()
    const endedTime = Date.now()
    const sessionDurationMinutes = Math.max(1, Math.ceil((endedTime - startedTime) / (1000 * 60)))

    let totalParticipantMinutes = 0
    for (const log of participantLogs.docs as any[]) {
      const logJoined = new Date(log.joinedAt).getTime()
      const logLeft = log.leftAt ? new Date(log.leftAt).getTime() : endedTime
      const logDurationMs = logLeft - logJoined
      const logDurationMinutes = Math.max(1, Math.ceil(logDurationMs / (1000 * 60)))
      totalParticipantMinutes += logDurationMinutes
    }

    const billableMinutes =
      totalParticipantMinutes > 0 ? totalParticipantMinutes : sessionDurationMinutes
    const costSoFar = billableMinutes * CREDIT_RATE.coinsPerMinute
    const remainingCredits = Math.max(0, currentCreditBalance - costSoFar)

    // Check if the tutor is out of credit. If so, automatically end the session!
    if (remainingCredits <= 0 && session.status === 'live') {
      const endedIso = new Date(endedTime).toISOString()

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

      // Backfill engagement flag on any earlier-closed attendance rows
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

      // 3. Deduct balance from tutor's wallet
      if (wallet) {
        const costToCharge = Math.min(currentCreditBalance, costSoFar)
        const newCoinBalance = Math.max(0, currentCreditBalance - costToCharge)

        await payload.update({
          collection: 'wallets',
          id: wallet.id,
          data: {
            creditBalance: newCoinBalance,
          } as any,
        })

        // Create transaction record
        await payload.create({
          collection: 'transactions',
          data: {
            reference: `session-${session.id}-autoclose-${Date.now()}`,
            gateway: 'wallet',
            type: 'payment',
            sender: session.tutor,
            receiver: session.tutor,
            tutor: session.tutor,
            relatedLiveSession: session.id,
            amount: costToCharge * CREDIT_RATE.nairaPerCoin,
            currency: 'ngn',
            status: 'success',
            description: `Live session automatically ended (out of credits). Charged ${costToCharge} credits.`,
          } as any,
        })
      }

      // 4. Update session status
      const updatedSession = await payload.update({
        collection: 'live-sessions',
        id: session.id,
        data: {
          endedAt: endedIso,
          status: 'ended',
          coinsConsumed: costSoFar,
          durationMinutes: sessionDurationMinutes,
        } as any,
      })

      // 5. Activity logs
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

        const entries: ActivityLogEntry[] = studentParticipants.map((p) => ({
          subjectId: p.user,
          actorId: tutorIdVal,
          type: 'class_ended',
          title: `${className} ended`,
          description: `Live session ended automatically due to out of credit. Duration: ${sessionDurationMinutes} minutes.`,
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
          description: `Session automatically ended (out of credit). Duration: ${sessionDurationMinutes} minutes.`,
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
        console.error('[live-sessions/status/autoclose] Failed to write activity logs:', logErr)
      }

      return NextResponse.json({
        status: 'ended',
        remainingCredits: 0,
        showWhiteboard: false,
        activeWhiteboard: null,
        startedAt: session.startedAt,
        endedAt: endedIso,
      })
    }

    return NextResponse.json({
      status: session.status,
      showWhiteboard: session.showWhiteboard || false,
      activeWhiteboard: session.activeWhiteboard || null,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      remainingCredits,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

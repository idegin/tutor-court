import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CREDIT_RATE } from '@/lib/constants'
import { createActivityLogs, ActivityLogEntry } from '@/lib/activity-log-service'
import { generateVideoSdkToken, isVideoSdkAvailable } from '@/lib/videosdk'
import { toIntId } from '@/lib/id'
import { participantUserId } from '@/lib/live-participant-id'

// Don't reconcile a participant log that was created moments ago: the /join
// API call lands seconds BEFORE the browser's WebRTC join completes, so a
// brand-new log briefly has no matching VideoSDK participant and would be
// wrongly closed ("left at minute 0") by the very first poll.
const RECONCILE_GRACE_MS = 90 * 1000

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

  const token = generateVideoSdkToken(3600 * 2, 'server')
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

    // Only an UN-ENDED VideoSDK session counts. Returning `[]` here would tell
    // the caller "the room is verifiably empty" and every DB-active participant
    // would be marked as left — but "no active session yet" is the NORMAL state
    // in the first seconds after the room is created (before anyone completes
    // the WebRTC join), and falling back to an ended session has the same
    // mass-close effect. In both cases the truth is unknown → skip (null).
    const activeSession = sessions.find((s: any) => !s.end)
    if (!activeSession) return null

    const sessionId = activeSession.id || activeSession.sessionId
    if (!sessionId) return null

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
    // Participant ids are `${userId}--${nonce}` (see lib/live-participant-id);
    // reduce them to app user ids for the DB comparison.
    return activeParticipants.map((p: any) => participantUserId(p.participantId))
  } catch (err) {
    console.error('[VideoSDK] Error fetching active participants:', err)
    return null
  }
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  const id = toIntId(params.id)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  if (!id) {
    return NextResponse.json({ error: 'Invalid session id.' }, { status: 400 })
  }

  try {
    const session = await payload
      .findByID({ collection: 'live-sessions', id, depth: 0 })
      .catch(() => null)

    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    // Authorization: only the session's tutor or an enrolled student/parent may
    // read status. This endpoint has heavy side effects (billing, auto-close,
    // attendance reconciliation), so it must never be callable by arbitrary users.
    const sessionTutorId =
      typeof session.tutor === 'object' ? (session.tutor as any).id : session.tutor
    const sessionClassId =
      typeof session.class === 'object' ? (session.class as any).id : session.class

    let isAuthorized = user.accountType === 'admin' || user.id === sessionTutorId
    if (!isAuthorized && sessionClassId) {
      const cls = await payload.findByID({
        collection: 'classes',
        id: sessionClassId,
        depth: 0,
      })
      if (cls) {
        const studentIds = (cls.students || []).map((s: any) =>
          typeof s === 'object' ? s.id : s,
        )
        const parentIds = ((cls as any).parents || []).map((p: any) =>
          typeof p === 'object' ? p.id : p,
        )
        isAuthorized = studentIds.includes(user.id) || parentIds.includes(user.id)
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    // Only the tutor (the wallet owner) ever needs the credit balance computed
    // and the auto-close side effects driven from their own polling loop. An
    // admin merely viewing status must stay side-effect-free — reconciliation
    // and billing math should never run off an admin's read.
    const isSessionTutor = user.id === sessionTutorId

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

    // Non-tutor (student/parent) pollers only need the lightweight state to know
    // when to join the room or show the whiteboard. They must NOT drive
    // attendance reconciliation, wallet billing, or auto-close — those are the
    // tutor's responsibility and the wallet is the tutor's.
    if (!isSessionTutor) {
      return NextResponse.json({
        status: session.status,
        showWhiteboard: session.showWhiteboard || false,
        activeWhiteboard: session.activeWhiteboard || null,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      })
    }

    // Reconcile database active participants with VideoSDK active participants
    if (session.roomId) {
      const activeVideoSdkUserIds = await getActiveVideoSdkParticipants(session.roomId)
      if (activeVideoSdkUserIds !== null) {
        const nowIso = new Date().toISOString()
        
        // All participant logs for this session — open ones may need closing,
        // closed ones may need REOPENING (e.g. a user closed one of two tabs:
        // /leave closed their only log while they're still live in the other).
        const dbLogs = await payload.find({
          collection: 'live-session-participants',
          where: { liveSession: { equals: session.id } },
          limit: 1000,
          depth: 0,
        })

        for (const log of dbLogs.docs as any[]) {
          const userIdStr = typeof log.user === 'object' ? String(log.user.id) : String(log.user)
          const logJoinedTime = new Date(log.joinedAt).getTime()

          if (log.leftAt) {
            // Closed log but the user is verifiably active in the room →
            // reopen for a new interval. Require the close to be at least a
            // few seconds old so a just-left user with a briefly stale
            // VideoSDK active list doesn't flap back open.
            const closedForMs = Date.now() - new Date(log.leftAt).getTime()
            if (activeVideoSdkUserIds.includes(userIdStr) && closedForMs > 15_000) {
              await payload.update({
                collection: 'live-session-participants',
                id: log.id,
                data: { leftAt: null, joinedAt: nowIso } as any,
              })
              if (log.accountType === 'student') {
                const closedAttendance = await payload.find({
                  collection: 'attendance',
                  where: {
                    and: [
                      { liveSession: { equals: session.id } },
                      { student: { equals: toIntId(userIdStr) ?? userIdStr } },
                    ],
                  },
                  limit: 1,
                  depth: 0,
                })
                const att = closedAttendance.docs[0] as any
                if (att && att.leftAt) {
                  await payload.update({
                    collection: 'attendance',
                    id: att.id,
                    data: { leftAt: null, joinedAt: nowIso } as any,
                  })
                }
              }
            }
            continue
          }

          // Give a fresh join time to complete its WebRTC handshake before we
          // trust VideoSDK's active list for it.
          if (Date.now() - logJoinedTime < RECONCILE_GRACE_MS) continue

          // If user is NOT active in VideoSDK, mark them as left in the DB
          if (!activeVideoSdkUserIds.includes(userIdStr)) {
            const intervalSeconds = Math.max(0, Math.floor((Date.now() - logJoinedTime) / 1000))

            await payload.update({
              collection: 'live-session-participants',
              id: log.id,
              data: {
                leftAt: nowIso,
                // Accumulate on top of earlier intervals (joinedAt is reset on
                // every rejoin, so this interval alone undercounts).
                durationSeconds: (Number(log.durationSeconds) || 0) + intervalSeconds,
              } as any,
            })

            // Reconcile attendance record for student
            if (log.accountType === 'student') {
              const activeAttendance = await payload.find({
                collection: 'attendance',
                where: {
                  and: [
                    { liveSession: { equals: session.id } },
                    { student: { equals: toIntId(userIdStr) ?? userIdStr } },
                    { leftAt: { exists: false } },
                  ],
                },
                limit: 1,
                depth: 0,
              })
              const att = activeAttendance.docs[0] as any
              if (att) {
                const attJoinedTime = new Date(att.joinedAt).getTime()
                // No 1-minute floor: intervals accumulate across rejoins.
                const attIntervalMinutes = Math.max(0, Math.ceil((Date.now() - attJoinedTime) / (1000 * 60)))
                await payload.update({
                  collection: 'attendance',
                  id: att.id,
                  data: {
                    leftAt: nowIso,
                    durationMinutes: (Number(att.durationMinutes) || 0) + attIntervalMinutes,
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
    // A missing wallet row is a data problem, NOT a zero balance. Treating it
    // as 0 would auto-end the class within one poll tick ("tutor ran out of
    // credits") even though the tutor may have plenty. Skip billing/auto-close
    // entirely and keep the class running.
    if (!wallet) {
      console.error(
        `[live-sessions/status] no wallet found for tutor ${String(session.tutor)} — skipping billing/auto-close`,
      )
      return NextResponse.json({
        status: session.status,
        showWhiteboard: session.showWhiteboard || false,
        activeWhiteboard: session.activeWhiteboard || null,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      })
    }
    const currentCreditBalance = (wallet.creditBalance as number) || 0

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
      // Closed logs carry their full accumulated duration (across rejoins) in
      // durationSeconds; open logs accumulate prior intervals there plus the
      // currently running one since joinedAt.
      let logSeconds: number
      if (log.leftAt) {
        logSeconds =
          Number(log.durationSeconds) ||
          Math.max(0, (new Date(log.leftAt).getTime() - new Date(log.joinedAt).getTime()) / 1000)
      } else {
        logSeconds =
          (Number(log.durationSeconds) || 0) +
          Math.max(0, (endedTime - new Date(log.joinedAt).getTime()) / 1000)
      }
      totalParticipantMinutes += Math.max(1, Math.ceil(logSeconds / 60))
    }

    const billableMinutes =
      totalParticipantMinutes > 0 ? totalParticipantMinutes : sessionDurationMinutes
    const costSoFar = billableMinutes * CREDIT_RATE.coinsPerMinute
    const remainingCredits = Math.max(0, currentCreditBalance - costSoFar)

    // Check if the tutor is out of credit. If so, automatically end the session!
    if (remainingCredits <= 0 && session.status === 'live') {
      const endedIso = new Date(endedTime).toISOString()

      // Atomically claim the live -> ended transition so two overlapping polls
      // (or a poll racing the manual /end route) can't both run billing.
      const claim = await payload.update({
        collection: 'live-sessions',
        where: { and: [{ id: { equals: id } }, { status: { equals: 'live' } }] },
        data: { status: 'ended', endedAt: endedIso } as any,
      })
      if (!claim.docs || claim.docs.length === 0) {
        // Another request already ended it; just report the ended state.
        return NextResponse.json({
          status: 'ended',
          remainingCredits: 0,
          showWhiteboard: false,
          activeWhiteboard: null,
          startedAt: session.startedAt,
          endedAt: endedIso,
        })
      }

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
        const intervalSeconds = Math.max(0, Math.floor((endedTime - logJoinedTime) / 1000))

        await payload.update({
          collection: 'live-session-participants',
          id: log.id,
          data: {
            leftAt: endedIso,
            durationSeconds: (Number(log.durationSeconds) || 0) + intervalSeconds,
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
        const attDurationMinutes =
          (Number(att.durationMinutes) || 0) +
          Math.max(0, Math.ceil((endedTime - attJoinedTime) / (1000 * 60)))

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
    console.error('[live-sessions/status] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

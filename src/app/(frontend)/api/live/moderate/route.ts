import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { toIntId } from '@/lib/id'
import { resolveSessionAccess } from '@/lib/live/access'
import { forceCloseParticipantTracks } from '@/lib/live/cf-realtime'
import { revokeAblyTokens } from '@/lib/live/ably-server'

export const runtime = 'nodejs'

// Host-only moderation for a live class. The tutor's client also broadcasts a
// control message over Ably for instant UX; THIS route makes it authoritative:
//   remove  → mark participant.removed (blocks rejoin) + force-close their SFU
//             tracks + revoke their Ably token (drops them from presence/chat).
//   promote → add to session.stagePublishers + role='publisher' (grants media publish).
//   demote  → remove from stagePublishers + role='viewer' + force-close their tracks.

const idOf = (v: any) => (v && typeof v === 'object' ? v.id : v)

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const action = body?.action as 'remove' | 'promote' | 'demote'
  const targetUserId = toIntId(body?.targetId)
  if (!['remove', 'promote', 'demote'].includes(action) || !targetUserId) {
    return NextResponse.json({ error: 'A valid action and targetId are required.' }, { status: 400 })
  }

  const access = await resolveSessionAccess(payload, body?.sessionId, user)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  if (!access.isHost) {
    return NextResponse.json({ error: 'Only the tutor can moderate this class.' }, { status: 403 })
  }
  // A host can't moderate themselves.
  if (String(targetUserId) === String(user.id)) {
    return NextResponse.json({ error: 'You cannot moderate yourself.' }, { status: 400 })
  }

  const sessionId = access.sessionId!

  // The target's participant log (for role/removed + their SFU session).
  const logRes = await payload
    .find({
      collection: 'live-session-participants',
      where: { and: [{ liveSession: { equals: sessionId } }, { user: { equals: targetUserId } }] },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
    })
    .catch(() => null)
  const log = logRes?.docs?.[0] as any

  try {
    if (action === 'remove') {
      if (log) {
        await payload.update({
          collection: 'live-session-participants',
          id: log.id,
          data: { removed: true, removedReason: String(body?.reason || 'Removed by tutor'), leftAt: new Date().toISOString() } as any,
        })
        if (log.sfuSessionId) await forceCloseParticipantTracks(log.sfuSessionId, String(targetUserId))
      }
      await revokeAblyTokens([String(targetUserId)])
      return NextResponse.json({ success: true })
    }

    // promote / demote update the session's stage roster.
    const fresh = await payload.findByID({ collection: 'live-sessions', id: sessionId, depth: 0 })
    const current = ((fresh.stagePublishers ?? []) as any[]).map((v) => idOf(v)).filter(Boolean)

    if (action === 'promote') {
      // Only an enrolled student may be promoted to the stage.
      const studentIds = ((access.cls?.students ?? []) as any[]).map((s) => idOf(s))
      if (!studentIds.some((s) => String(s) === String(targetUserId))) {
        return NextResponse.json({ error: 'Only enrolled students can be promoted.' }, { status: 400 })
      }
      const next = Array.from(new Set([...current, targetUserId]))
      await payload.update({ collection: 'live-sessions', id: sessionId, data: { stagePublishers: next } as any })
      if (log) await payload.update({ collection: 'live-session-participants', id: log.id, data: { role: 'publisher' } as any })
    } else {
      const next = current.filter((id) => String(id) !== String(targetUserId))
      await payload.update({ collection: 'live-sessions', id: sessionId, data: { stagePublishers: next } as any })
      if (log) {
        await payload.update({ collection: 'live-session-participants', id: log.id, data: { role: 'viewer' } as any })
        if (log.sfuSessionId) await forceCloseParticipantTracks(log.sfuSessionId, String(targetUserId))
      }
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[live/moderate] error:', err)
    return NextResponse.json({ error: 'Moderation failed.' }, { status: 500 })
  }
}

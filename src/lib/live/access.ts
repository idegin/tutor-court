import { toIntId } from '@/lib/id'

// Shared authorization for live-session endpoints: is this user allowed in this
// session's room, and are they the host (tutor)? Mirrors the audience the
// classroom page + legacy join/status/chat routes authorize (tutor, enrolled
// students, linked parents) so access is consistent everywhere.

export type LiveRole = 'host' | 'participant' | 'observer'

export interface SessionAccess {
  ok: boolean
  status: number
  error?: string
  /** Normalized integer session id — use THIS (not the raw request param) to
   *  build channel names, so access and channel always agree. */
  sessionId?: number
  session?: any
  cls?: any
  role?: LiveRole
  isHost?: boolean
  /** Data-plane publish rights: host + students publish; parents observe only. */
  canPublish?: boolean
}

const idOf = (v: any): number | string | undefined =>
  v == null ? undefined : typeof v === 'object' ? v.id : v

export async function resolveSessionAccess(
  payload: any,
  sessionIdRaw: unknown,
  user: { id: number | string; accountType?: string } | null,
): Promise<SessionAccess> {
  if (!user) return { ok: false, status: 401, error: 'Unauthorized.' }

  const sessionId = toIntId(sessionIdRaw)
  if (!sessionId) return { ok: false, status: 400, error: 'A valid sessionId is required.' }

  const session = await payload
    .findByID({ collection: 'live-sessions', id: sessionId, depth: 0 })
    .catch(() => null)
  if (!session) return { ok: false, status: 404, error: 'Live session not found.' }

  // Never mint credentials for a dead room (mirrors the join route's 409).
  if (session.status === 'ended' || session.status === 'cancelled') {
    return { ok: false, status: 409, error: 'This live session is no longer active.' }
  }

  const classId = idOf(session.class)
  const cls = classId
    ? await payload.findByID({ collection: 'classes', id: classId, depth: 0 }).catch(() => null)
    : null
  if (!cls) return { ok: false, status: 404, error: 'Class not found.' }

  if (user.accountType === 'admin') {
    return { ok: true, status: 200, sessionId, session, cls, role: 'host', isHost: true, canPublish: true }
  }

  // The host is the session's OWN tutor (supports a substitute/co-tutor
  // hosting a session for a class they don't own); fall back to the class tutor.
  const tutorId = idOf(session.tutor) ?? idOf(cls.tutor)
  const studentIds = (cls.students ?? []).map(idOf)
  const parentIds = (cls.parents ?? []).map(idOf)

  const isHost = String(user.id) === String(tutorId)
  const isStudent = studentIds.some((s: any) => String(s) === String(user.id))
  const isParent = parentIds.some((p: any) => String(p) === String(user.id))

  if (!isHost && !isStudent && !isParent) {
    return { ok: false, status: 403, error: 'You are not a member of this class.' }
  }

  // One participant-row read serves both the removal check and stage status
  // (the row's `role` is authoritative — no read-modify-write race like a shared
  // stagePublishers array would have).
  let onStage = false
  if (!isHost) {
    const plog = await payload
      .find({
        collection: 'live-session-participants',
        where: { and: [{ liveSession: { equals: sessionId } }, { user: { equals: user.id } }] },
        sort: '-createdAt',
        limit: 1,
        depth: 0,
      })
      .catch(() => null)
    const row = plog?.docs?.[0] as any
    // A host-removed participant is refused everywhere (token re-issue, RTC,
    // moderate) — this is what makes a kick stick across a refresh/reauth.
    if (row?.removed) {
      return { ok: false, status: 403, error: 'You have been removed from this class.' }
    }
    onStage = row?.role === 'publisher'
  }

  // Broadcast model: only the host and host-promoted students publish MEDIA.
  // Everyone non-observer can still use chat/reactions/hands (Ably capability).
  const role: LiveRole = isHost ? 'host' : isStudent ? 'participant' : 'observer'
  const canPublish = isHost || (isStudent && onStage)
  return { ok: true, status: 200, sessionId, session, cls, role, isHost, canPublish }
}

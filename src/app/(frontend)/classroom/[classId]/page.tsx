import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ClassroomExperience } from './_live/experience'
import { ClassroomUnavailable } from './_live/unavailable'
import type { ClassroomBootstrap, Identity, LiveSession, Whiteboard } from './_live/types'
import { isLiveClassroomReady } from '@/lib/live/config'
import { seededHue } from './_live/avatar'
import { toIntId } from '@/lib/id'

// Live Classroom v2 — real data only.
//
// This server component resolves the class, the authenticated user, and the
// active live session, then hands the client a fully-real ClassroomBootstrap.
// When the backend keys aren't configured (or the user can't access the class)
// we render a clear "unavailable" screen — never a simulated room.

interface PageProps {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ sessionId?: string }>
}

const idOf = (v: any) => (v && typeof v === 'object' ? v.id : v)

export default async function ClassroomPage({ params, searchParams }: PageProps) {
  const { classId } = await params
  const { sessionId: sessionIdParam } = await searchParams

  // Backend not configured → honest unavailable state (no mock fallback).
  if (!isLiveClassroomReady()) {
    return <ClassroomUnavailable reason="not_configured" />
  }

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return <ClassroomUnavailable reason="unauthenticated" classId={classId} />
  }

  const numericClassId = /^\d+$/.test(classId) ? Number(classId) : classId
  const cls = await payload
    .findByID({ collection: 'classes', id: numericClassId, depth: 1 })
    .catch(() => null)

  if (!cls) {
    return <ClassroomUnavailable reason="not_found" />
  }

  // Membership check — only the tutor, an enrolled student, or a linked parent
  // (or an admin) may enter.
  const uid = String(user.id)
  const tutorId = String(idOf(cls.tutor))
  const studentIds = (cls.students ?? []).map((s: any) => String(idOf(s)))
  const parentIds = ((cls as any).parents ?? []).map((p: any) => String(idOf(p)))
  const isTutor = uid === tutorId
  const isStudent = studentIds.includes(uid)
  const isParent = parentIds.includes(uid)
  const isAdmin = user.accountType === 'admin'

  if (!isTutor && !isStudent && !isParent && !isAdmin) {
    return <ClassroomUnavailable reason="forbidden" />
  }

  // Resolve the active live session: prefer the one named in ?sessionId= (when
  // it's live and belongs to this class), otherwise the newest live session.
  let liveSession: any = null
  const sid = toIntId(sessionIdParam)
  if (sid) {
    const s = await payload
      .findByID({ collection: 'live-sessions', id: sid, depth: 0 })
      .catch(() => null)
    if (s && s.status === 'live' && String(idOf(s.class)) === String(numericClassId)) {
      liveSession = s
    }
  }
  if (!liveSession) {
    const live = await payload
      .find({
        collection: 'live-sessions',
        where: { and: [{ class: { equals: numericClassId } }, { status: { equals: 'live' } }] },
        sort: ['-startedAt', '-id'],
        limit: 1,
        depth: 0,
      })
      .catch(() => null)
    liveSession = live?.docs?.[0] ?? null
  }

  // Room display metadata — sourced from the class so the lobby/waiting screens
  // show real info even before a live session exists.
  const tutorDoc = cls.tutor
  const tutorName =
    (tutorDoc && typeof tutorDoc === 'object'
      ? `${(tutorDoc as any).firstName ?? ''} ${(tutorDoc as any).lastName ?? ''}`.trim() ||
        (tutorDoc as any).email
      : '') || 'Your tutor'
  const subjectDoc = (cls as any).subject
  const subjectName =
    subjectDoc && typeof subjectDoc === 'object'
      ? (subjectDoc as any).name ?? 'General'
      : 'General'

  const sessionMeta: LiveSession = {
    id: liveSession ? String(liveSession.id) : '',
    roomId: liveSession?.roomId ?? '',
    classTitle: (cls as any).title || 'Live class',
    subject: subjectName,
    classType: (cls as any).classType === 'group' ? 'group' : 'one-on-one',
    tutorName,
    status: liveSession ? (liveSession.status as any) : 'waiting',
    whiteboardVisible: Boolean(liveSession?.showWhiteboard),
    whiteboardWritable: Boolean(liveSession?.whiteboardWritable),
    activeWhiteboardId: liveSession?.activeWhiteboard
      ? String(idOf(liveSession.activeWhiteboard))
      : null,
  }

  const identity: Identity = {
    id: uid,
    name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
    accountType: isTutor ? 'tutor' : isStudent ? 'student' : 'parent',
    role: isTutor ? 'host' : 'viewer',
    // Tutor + enrolled students publish media (everyone sees everyone); parents
    // observe only. MUST match the server (access.ts: canPublish = host ||
    // student) or a student's SFU publish is 403'd and kills their realtime join.
    canPublish: isTutor || isStudent,
  }

  // Tutor-only wallet balance for the live credit meter.
  let creditBalance: number | null = null
  if (isTutor) {
    const wallet = await payload
      .find({ collection: 'wallets', where: { user: { equals: user.id } }, limit: 1, depth: 0 })
      .catch(() => null)
    creditBalance = Number((wallet?.docs?.[0] as any)?.creditBalance ?? 0)
  }

  // Hydrate the class's persisted whiteboards (+ their stroke snapshots) so the
  // room opens with existing boards, and a (re)joiner renders their content
  // immediately before live Ably ops arrive.
  let boards: Whiteboard[] = []
  const wbRes = await payload
    .find({
      collection: 'whiteboards',
      where: { class: { equals: numericClassId } },
      sort: 'createdAt',
      limit: 50,
      depth: 0,
    })
    .catch(() => null)
  if (wbRes?.docs) {
    boards = wbRes.docs.map((wb: any) => ({
      id: String(wb.id),
      title: wb.title || 'Board',
      hue: seededHue(String(wb.id)),
      createdBy: String(idOf(wb.owner)),
      snapshot: Array.isArray(wb.snapshot) ? wb.snapshot : [],
    }))
  }

  const bootstrap: ClassroomBootstrap = {
    ready: true,
    role: isTutor ? 'tutor' : 'student',
    classId: String(numericClassId),
    identity,
    session: sessionMeta,
    liveSessionId: liveSession ? liveSession.id : null,
    startedAt: liveSession?.startedAt ? String(liveSession.startedAt) : null,
    creditBalance,
    boards,
  }

  return <ClassroomExperience bootstrap={bootstrap} />
}

import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { toIntId } from '@/lib/id'

const MAX_MESSAGE_LENGTH = 2000
const PAGE_LIMIT = 200

/**
 * Authorize the current user for a given live session: the hosting tutor, an
 * admin, or a student/parent enrolled in the session's class may read and post.
 * Mirrors the check in the session status route so chat access stays consistent.
 */
async function authorizeSession(payload: any, sessionId: number, user: any) {
  const session = await payload
    .findByID({ collection: 'live-sessions', id: sessionId, depth: 0 })
    .catch(() => null)
  if (!session) return { ok: false as const, status: 404, error: 'Session not found.' }

  const sessionTutorId = typeof session.tutor === 'object' ? session.tutor.id : session.tutor
  const sessionClassId = typeof session.class === 'object' ? session.class.id : session.class

  let isAuthorized = user.accountType === 'admin' || user.id === sessionTutorId
  if (!isAuthorized && sessionClassId) {
    const cls = await payload
      .findByID({ collection: 'classes', id: sessionClassId, depth: 0 })
      .catch(() => null)
    if (cls) {
      const studentIds = (cls.students || []).map((s: any) => (typeof s === 'object' ? s.id : s))
      const parentIds = (cls.parents || []).map((p: any) => (typeof p === 'object' ? p.id : p))
      isAuthorized = studentIds.includes(user.id) || parentIds.includes(user.id)
    }
  }

  if (!isAuthorized) return { ok: false as const, status: 403, error: 'Forbidden.' }
  return { ok: true as const, session }
}

function serialize(doc: any) {
  return {
    id: doc.id,
    message: doc.message,
    senderId: typeof doc.sender === 'object' ? doc.sender.id : doc.sender,
    senderName: doc.senderName,
    senderAccountType: doc.senderAccountType,
    createdAt: doc.createdAt,
  }
}

// GET /api/live-sessions/:id/chat?after=<messageId>
// Returns messages for the session ordered oldest-first. When `after` is given,
// only messages newer than that id are returned so the classroom can poll for
// just the delta instead of refetching the whole history each tick.
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  const id = toIntId(params.id)

  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (!id) return NextResponse.json({ error: 'Invalid session id.' }, { status: 400 })

  const auth = await authorizeSession(payload, id, user)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const url = new URL(request.url)
  const afterRaw = url.searchParams.get('after')
  const after = afterRaw ? toIntId(afterRaw) : null

  const where: any = { liveSession: { equals: id } }
  if (after) where.id = { greater_than: after }

  try {
    const result = await payload.find({
      collection: 'live-session-messages',
      where,
      // Oldest-first; when polling a delta this is naturally small. On the
      // initial load (no cursor) we take the most recent page, then the client
      // renders them in order.
      sort: after ? 'id' : '-id',
      limit: PAGE_LIMIT,
      depth: 0,
    })
    const docs = after ? result.docs : [...result.docs].reverse()
    return NextResponse.json({ messages: docs.map(serialize) })
  } catch (error: any) {
    console.error('[live-sessions/chat] GET error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

// POST /api/live-sessions/:id/chat  body: { message: string }
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  const id = toIntId(params.id)

  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (!id) return NextResponse.json({ error: 'Invalid session id.' }, { status: 400 })

  const auth = await authorizeSession(payload, id, user)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => ({}))
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Message is too long.' }, { status: 400 })
  }

  // Build the display name server-side — never trust a client-supplied name.
  const senderName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Participant'

  try {
    // Idempotency guard: if this exact message from this sender was just written
    // (double-click, a retried request, or a component remount re-firing the
    // send), return the existing row instead of creating a duplicate. This is
    // what caused "every message is delivered twice".
    //
    // The window is deliberately short: the client's in-flight ref already
    // stops true double-submits, so this only needs to catch a raced retry. A
    // long window (it used to be 10s) made a deliberately repeated message
    // ("ok" … "ok") silently vanish — the second POST returned the first row's
    // id, which the client had already rendered. A repeat typed within 2s can
    // still be swallowed; fully fixing that needs a client-generated message
    // nonce persisted on the row (schema change), which text-equality dedupe
    // can't replicate.
    const DEDUPE_WINDOW_MS = 2_000
    const recent = await payload.find({
      collection: 'live-session-messages',
      where: {
        and: [
          { liveSession: { equals: id } },
          { sender: { equals: user.id } },
          { message: { equals: message } },
          { createdAt: { greater_than: new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString() } },
        ],
      },
      sort: '-id',
      limit: 1,
      depth: 0,
    })
    if (recent.docs.length > 0) {
      return NextResponse.json({ message: serialize(recent.docs[0]), deduped: true }, { status: 200 })
    }

    const created = await payload.create({
      collection: 'live-session-messages',
      data: {
        liveSession: id,
        sender: user.id,
        senderName,
        senderAccountType: user.accountType,
        message,
      } as any,
      depth: 0,
    })
    return NextResponse.json({ message: serialize(created) }, { status: 201 })
  } catch (error: any) {
    console.error('[live-sessions/chat] POST error:', error)
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 })
  }
}

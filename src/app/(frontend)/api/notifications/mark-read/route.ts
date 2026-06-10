import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// POST /api/notifications/mark-read – mark one or all notifications as read
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: any = {}
  try { body = await request.json() } catch { /* no body */ }

  const { notificationId, markAll } = body

  if (markAll) {
    // Mark all as read for this user
    const unread = await payload.find({
      collection: 'notifications',
      where: {
        and: [
          { recipient: { equals: user.id } },
          { isRead: { equals: false } },
        ],
      },
      limit: 500,
      depth: 0,
    })

    await Promise.all(
      unread.docs.map((n) =>
        payload.update({
          collection: 'notifications',
          id: n.id,
          data: { isRead: true } as any,
          overrideAccess: true,
        }),
      ),
    )

    return NextResponse.json({ success: true, updated: unread.docs.length })
  }

  if (!notificationId) {
    return NextResponse.json({ error: 'notificationId or markAll required.' }, { status: 400 })
  }

  // Mark single notification
  const notif = await payload.findByID({
    collection: 'notifications',
    id: notificationId,
    depth: 0,
  })

  const recipientId = typeof (notif as any).recipient === 'object'
    ? (notif as any).recipient.id
    : (notif as any).recipient

  if (recipientId !== user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  await payload.update({
    collection: 'notifications',
    id: notificationId,
    data: { isRead: true } as any,
    overrideAccess: true,
  })

  return NextResponse.json({ success: true })
}

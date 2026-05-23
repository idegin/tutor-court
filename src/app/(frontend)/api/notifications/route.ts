import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// GET /api/notifications – fetch notifications for the logged-in user
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page') || '1')
  const limit = Number(searchParams.get('limit') || '20')
  const unreadOnly = searchParams.get('unreadOnly') === 'true'

  const whereConditions: any[] = [{ recipient: { equals: user.id } }]
  if (unreadOnly) {
    whereConditions.push({ isRead: { equals: false } })
  }

  const result = await payload.find({
    collection: 'notifications',
    where: { and: whereConditions },
    sort: '-createdAt',
    page,
    limit,
    depth: 0,
  })

  return NextResponse.json(result)
}

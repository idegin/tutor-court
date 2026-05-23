import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// GET – list assessments for the logged-in tutor
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page') || '1')
  const limit = Number(searchParams.get('limit') || '20')
  const subjectId = searchParams.get('subject')

  const whereConditions: any[] = [{ tutor: { equals: user.id } }]
  if (subjectId) whereConditions.push({ subject: { equals: subjectId } })

  const result = await payload.find({
    collection: 'assessments',
    where: { and: whereConditions },
    sort: '-createdAt',
    page,
    limit,
    depth: 1,
  })

  return NextResponse.json(result)
}

// POST – create a new assessment
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can create assessments.' }, { status: 403 })
  }

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { title, description, subject, type, timeLimitMinutes, passingScore } = body

  if (!title || !subject || !type) {
    return NextResponse.json({ error: 'title, subject, and type are required.' }, { status: 400 })
  }

  const assessment = await payload.create({
    collection: 'assessments',
    data: {
      title,
      description: description || '',
      subject,
      tutor: user.id,
      type,
      timeLimitMinutes: timeLimitMinutes || 0,
      passingScore: passingScore ?? 70,
      isPublished: false,
    } as any,
  })

  return NextResponse.json({ success: true, assessment })
}

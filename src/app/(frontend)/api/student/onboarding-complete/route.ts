import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'student') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { gradeLevel, country, learningGoals, subjectIds } = body

  if (!gradeLevel || typeof gradeLevel !== 'string' || !gradeLevel.trim()) {
    return NextResponse.json({ error: 'Grade level is required.' }, { status: 400 })
  }

  const cleanSubjectIds = Array.isArray(subjectIds)
    ? subjectIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
    : []

  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      gradeLevel: gradeLevel.trim(),
      country: country?.trim() || null,
      learningGoals: learningGoals?.trim() || null,
      subjectsOfInterest: cleanSubjectIds,
      hasCompletedOnboarding: true,
    } as any,
    overrideAccess: true,
  })

  return NextResponse.json({ ok: true })
}

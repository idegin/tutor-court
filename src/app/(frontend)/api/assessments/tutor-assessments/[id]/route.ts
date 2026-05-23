import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { id } = await params

  let tutorAssessment: any
  try {
    tutorAssessment = await payload.findByID({
      collection: 'tutor-assessments',
      id,
      depth: 2,
    })
  } catch {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  if (!tutorAssessment) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  // Access check – only the assigned tutor, student, or admin may view
  const tutorId =
    typeof tutorAssessment.tutor === 'object' ? tutorAssessment.tutor?.id : tutorAssessment.tutor
  const studentId =
    typeof tutorAssessment.student === 'object'
      ? tutorAssessment.student?.id
      : tutorAssessment.student

  if (user.id !== tutorId && user.id !== studentId && user.accountType !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  // Fetch the associated result if it exists
  const resultData = await payload.find({
    collection: 'assessment-results',
    where: { tutorAssessment: { equals: id } },
    depth: 2,
    limit: 1,
  })

  const result = resultData.docs[0] ?? null

  return NextResponse.json({ tutorAssessment, result })
}

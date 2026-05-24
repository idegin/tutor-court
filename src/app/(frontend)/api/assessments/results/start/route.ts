import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * POST – the student starts (or resumes) an assessment.
 * Idempotent: returns the existing draft result if one exists.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'student') {
    return NextResponse.json({ error: 'Only students can start an assessment.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const tutorAssessmentId = body?.tutorAssessmentId
  if (!tutorAssessmentId) {
    return NextResponse.json({ error: 'tutorAssessmentId is required.' }, { status: 400 })
  }

  let ta: any
  try {
    ta = await payload.findByID({
      collection: 'tutor-assessments',
      id: tutorAssessmentId,
      depth: 0,
    })
  } catch {
    return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 })
  }

  const studentId = typeof ta.student === 'object' ? ta.student?.id : ta.student
  if (studentId !== user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  if (ta.status === 'completed') {
    return NextResponse.json({ error: 'Assessment already completed.' }, { status: 409 })
  }

  if (ta.status === 'expired') {
    return NextResponse.json({ error: 'Assessment has expired.' }, { status: 409 })
  }

  const existing = await payload.find({
    collection: 'assessment-results',
    where: { tutorAssessment: { equals: tutorAssessmentId } },
    limit: 1,
    depth: 0,
  })

  let result = existing.docs[0]

  if (!result) {
    const tutorId = typeof ta.tutor === 'object' ? ta.tutor?.id : ta.tutor
    result = await payload.create({
      collection: 'assessment-results',
      data: {
        tutorAssessment: tutorAssessmentId,
        student: user.id,
        tutor: tutorId,
        answers: [],
        totalPoints: 0,
        earnedPoints: 0,
        score: 0,
        passed: false,
      } as any,
    })
  }

  if (ta.status !== 'in_progress') {
    await payload.update({
      collection: 'tutor-assessments',
      id: tutorAssessmentId,
      data: { status: 'in_progress' } as any,
    })
  }

  return NextResponse.json({
    success: true,
    startedAt: result.createdAt,
    resultId: result.id,
  })
}

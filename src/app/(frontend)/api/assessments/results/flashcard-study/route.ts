import { NextResponse } from 'next/server'
import { getRouteUser } from '@/lib/auth'
import { createNotification, notifyParent } from '@/lib/notification-service'
import { createActivityLogs } from '@/lib/activity-log-service'

type SelfRating = {
  questionId: string
  rating: 'got_it' | 'almost' | 'no'
}

/**
 * POST – student submits a flashcard study session.
 * Accepts self-ratings per card, computes mastery (got_it / total * 100),
 * and marks the tutor-assessment completed.
 */
export async function POST(request: Request) {
  const { user, payload } = await getRouteUser()

  if (!user || user.accountType !== 'student') {
    return NextResponse.json({ error: 'Only students can submit flashcard sessions.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const rawId = body?.tutorAssessmentId
  const selfRatings: SelfRating[] = Array.isArray(body?.selfRatings) ? body.selfRatings : []

  if (!rawId) {
    return NextResponse.json({ error: 'tutorAssessmentId is required.' }, { status: 400 })
  }

  const tutorAssessmentId =
    typeof rawId === 'string' && /^\d+$/.test(rawId) ? Number(rawId) : rawId

  let ta: any
  try {
    ta = await payload.findByID({
      collection: 'tutor-assessments',
      id: tutorAssessmentId,
      depth: 2,
    })
  } catch {
    return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 })
  }

  const studentId = typeof ta.student === 'object' ? ta.student?.id : ta.student
  if (studentId !== user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  if (ta.status === 'completed') {
    return NextResponse.json({ error: 'Flashcard session already submitted.' }, { status: 409 })
  }

  // Mastery = cards rated "got_it" / total rated * 100
  const totalRated = selfRatings.length
  const gotItCount = selfRatings.filter((r) => r.rating === 'got_it').length
  const mastery = totalRated > 0 ? Math.round((gotItCount / totalRated) * 100) : 0

  const tutorId = typeof ta.tutor === 'object' ? ta.tutor?.id : ta.tutor
  const submittedAt = new Date()

  const existingResultRes = await payload.find({
    collection: 'assessment-results',
    where: { tutorAssessment: { equals: tutorAssessmentId } },
    limit: 1,
    depth: 0,
  })
  const existingResult = existingResultRes.docs[0] as any | undefined

  let timeTakenSeconds = 0
  if (existingResult?.createdAt) {
    timeTakenSeconds = Math.max(
      0,
      Math.floor((submittedAt.getTime() - new Date(existingResult.createdAt).getTime()) / 1000),
    )
  }

  const resultData = {
    tutorAssessment: tutorAssessmentId,
    student: user.id,
    tutor: tutorId,
    answers: [],
    totalPoints: totalRated,
    earnedPoints: gotItCount,
    score: mastery,
    mastery,
    passed: mastery >= 70,
    submittedAt: submittedAt.toISOString(),
    timeTakenSeconds,
  }

  let result
  if (existingResult) {
    result = await payload.update({
      collection: 'assessment-results',
      id: existingResult.id,
      data: resultData as any,
    })
  } else {
    result = await payload.create({
      collection: 'assessment-results',
      data: resultData as any,
    })
  }

  await payload.update({
    collection: 'tutor-assessments',
    id: tutorAssessmentId,
    data: { status: 'completed' } as any,
  })

  const assessmentTitle =
    typeof ta.assessment === 'object' ? ta.assessment?.title : 'a flashcard set'
  const studentName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
  const classId = typeof ta.class === 'object' ? ta.class?.id : ta.class
  const assessmentId = typeof ta.assessment === 'object' ? ta.assessment?.id : ta.assessment
  const tutorLink =
    classId && assessmentId
      ? `/dashboard/tutor/classes/${classId}/assessments/${assessmentId}`
      : `/dashboard/tutor/assessments`

  if (tutorId) {
    createNotification({
      recipientId: String(tutorId),
      type: 'assessment_completed',
      title: 'Flashcard Session Completed',
      message: `${studentName} completed "${assessmentTitle}" with ${mastery}% mastery.`,
      link: tutorLink,
      relatedCollection: 'tutor-assessments',
      relatedId: String(tutorAssessmentId),
    }).catch(() => {})
  }

  notifyParent(user.id, {
    type: 'assessment_completed',
    title: 'Flashcard Session Completed',
    message: `${studentName} completed "${assessmentTitle}" with ${mastery}% mastery.`,
    link: `/dashboard/parent/students/${user.id}/assessments/${tutorAssessmentId}`,
    relatedCollection: 'tutor-assessments',
    relatedId: String(tutorAssessmentId),
  }).catch(() => {})

  createActivityLogs([
    {
      subjectId: user.id,
      actorId: user.id,
      type: 'assessment_completed',
      title: `Completed flashcard set: ${assessmentTitle}`,
      description: `Mastery: ${mastery}%`,
      link: `/dashboard/student/assessments/${tutorAssessmentId}`,
      relatedCollection: 'assessment-results',
      relatedId: String((result as any).id),
      metadata: { mastery, tutorAssessmentId },
    },
  ]).catch(() => {})

  return NextResponse.json({ success: true, mastery, result })
}

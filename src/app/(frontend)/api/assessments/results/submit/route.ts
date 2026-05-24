import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { createNotification } from '@/lib/notification-service'

type SubmittedAnswer = {
  questionId: string
  selectedOptionIndices?: number[]
  textAnswer?: string
}

function gradeAnswer(question: any, answer: SubmittedAnswer): { isCorrect: boolean; pointsEarned: number } {
  const opts: { isCorrect?: boolean }[] = Array.isArray(question?.options) ? question.options : []
  const points = Number(question?.points ?? 1)
  const selected = new Set((answer.selectedOptionIndices || []).filter((n) => Number.isInteger(n)))

  if (question?.type === 'single_choice' || question?.type === 'true_false') {
    if (selected.size !== 1) return { isCorrect: false, pointsEarned: 0 }
    const idx = [...selected][0]
    const isCorrect = Boolean(opts[idx]?.isCorrect)
    return { isCorrect, pointsEarned: isCorrect ? points : 0 }
  }

  if (question?.type === 'multiple_choice') {
    const correctIndices = new Set(
      opts.map((o, i) => (o?.isCorrect ? i : -1)).filter((i) => i >= 0),
    )
    if (correctIndices.size === 0) return { isCorrect: false, pointsEarned: 0 }
    const sameSize = selected.size === correctIndices.size
    const allMatch = sameSize && [...selected].every((i) => correctIndices.has(i))
    return { isCorrect: allMatch, pointsEarned: allMatch ? points : 0 }
  }

  return { isCorrect: false, pointsEarned: 0 }
}

/**
 * POST – the student submits their answers.
 * Grades server-side using the questions' isCorrect flags, then marks
 * the tutor-assessment completed and notifies the tutor.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'student') {
    return NextResponse.json({ error: 'Only students can submit assessments.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const tutorAssessmentId = body?.tutorAssessmentId
  const answers: SubmittedAnswer[] = Array.isArray(body?.answers) ? body.answers : []

  if (!tutorAssessmentId) {
    return NextResponse.json({ error: 'tutorAssessmentId is required.' }, { status: 400 })
  }

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
    return NextResponse.json({ error: 'Assessment already submitted.' }, { status: 409 })
  }

  const selectedQuestionIds: string[] = (ta.selectedQuestions || []).map((q: any) =>
    typeof q === 'object' ? q.id : q,
  )

  const questionsRes = await payload.find({
    collection: 'assessment-questions',
    where: { id: { in: selectedQuestionIds } },
    limit: 200,
    depth: 0,
  })
  const questionById = new Map<string, any>(questionsRes.docs.map((q: any) => [String(q.id), q]))

  let totalPoints = 0
  let earnedPoints = 0
  const gradedAnswers = selectedQuestionIds.map((qid) => {
    const q = questionById.get(String(qid))
    const submitted = answers.find((a) => String(a.questionId) === String(qid)) || {
      questionId: qid,
      selectedOptionIndices: [],
    }
    const { isCorrect, pointsEarned } = q
      ? gradeAnswer(q, submitted)
      : { isCorrect: false, pointsEarned: 0 }
    totalPoints += Number(q?.points ?? 0)
    earnedPoints += pointsEarned
    return {
      question: qid,
      selectedOptions: (submitted.selectedOptionIndices || []).map((idx) => ({ optionIndex: idx })),
      textAnswer: submitted.textAnswer || '',
      isCorrect,
      pointsEarned,
    }
  })

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
  const passingScore =
    typeof ta.assessment === 'object' ? Number(ta.assessment?.passingScore ?? 70) : 70
  const passed = score >= passingScore

  const existingResultRes = await payload.find({
    collection: 'assessment-results',
    where: { tutorAssessment: { equals: tutorAssessmentId } },
    limit: 1,
    depth: 0,
  })
  const existingResult = existingResultRes.docs[0]
  const submittedAt = new Date()

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
    tutor: typeof ta.tutor === 'object' ? ta.tutor?.id : ta.tutor,
    answers: gradedAnswers,
    totalPoints,
    earnedPoints,
    score,
    passed,
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

  const tutorId = typeof ta.tutor === 'object' ? ta.tutor?.id : ta.tutor
  const assessmentTitle =
    typeof ta.assessment === 'object' ? ta.assessment?.title : 'an assessment'
  const studentName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
  const classId = typeof ta.class === 'object' ? ta.class?.id : ta.class
  const assessmentId = typeof ta.assessment === 'object' ? ta.assessment?.id : ta.assessment

  if (tutorId) {
    await createNotification({
      recipientId: String(tutorId),
      type: 'assessment_completed',
      title: 'Assessment Completed',
      message: `${studentName} completed "${assessmentTitle}" with a score of ${score}%.`,
      link: classId && assessmentId
        ? `/dashboard/tutor/classes/${classId}/assessments/${assessmentId}`
        : `/dashboard/tutor/assessments/${tutorAssessmentId}`,
      relatedCollection: 'tutor-assessments',
      relatedId: String(tutorAssessmentId),
    })
  }

  return NextResponse.json({ success: true, result })
}

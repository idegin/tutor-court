import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { createNotification } from '@/lib/notification-service'
import { createActivityLogs } from '@/lib/activity-log-service'
import { sendEmail } from '@/lib/email-service'
import { getBaseEmailLayout, getEmailServerUrl } from '@/lib/email-template'

type SubmittedAnswer = {
  questionId: string
  selectedOptionIndices?: number[]
  textAnswer?: string
}

const MANUAL_TYPES = ['short_answer', 'essay']

function gradeAnswer(
  question: any,
  answer: SubmittedAnswer,
): { isCorrect: boolean; pointsEarned: number; needsReview: boolean } {
  const opts: { isCorrect?: boolean }[] = Array.isArray(question?.options) ? question.options : []
  const points = Number(question?.points ?? 1)
  const selected = new Set((answer.selectedOptionIndices || []).filter((n) => Number.isInteger(n)))

  // Short-answer/essay questions can't be auto-graded. Leave them at 0 points
  // and flag them for manual review by the tutor rather than marking them wrong.
  if (MANUAL_TYPES.includes(question?.type)) {
    return { isCorrect: false, pointsEarned: 0, needsReview: true }
  }

  if (question?.type === 'single_choice' || question?.type === 'true_false') {
    if (selected.size !== 1) return { isCorrect: false, pointsEarned: 0, needsReview: false }
    const idx = [...selected][0]
    const isCorrect = Boolean(opts[idx]?.isCorrect)
    return { isCorrect, pointsEarned: isCorrect ? points : 0, needsReview: false }
  }

  if (question?.type === 'multiple_choice') {
    const correctIndices = new Set(
      opts.map((o, i) => (o?.isCorrect ? i : -1)).filter((i) => i >= 0),
    )
    if (correctIndices.size === 0) return { isCorrect: false, pointsEarned: 0, needsReview: false }
    const sameSize = selected.size === correctIndices.size
    const allMatch = sameSize && [...selected].every((i) => correctIndices.has(i))
    return { isCorrect: allMatch, pointsEarned: allMatch ? points : 0, needsReview: false }
  }

  return { isCorrect: false, pointsEarned: 0, needsReview: false }
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

  const rawId = body?.tutorAssessmentId
  const answers: SubmittedAnswer[] = Array.isArray(body?.answers) ? body.answers : []

  if (!rawId) {
    return NextResponse.json({ error: 'tutorAssessmentId is required.' }, { status: 400 })
  }
  // Collections use integer primary keys; the client sends the id as a string,
  // so coerce numeric strings or Payload's relationship validation rejects them.
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
  let pendingManualGrading = false
  const gradedAnswers = selectedQuestionIds.map((qid) => {
    const q = questionById.get(String(qid))
    const submitted = answers.find((a) => String(a.questionId) === String(qid)) || {
      questionId: qid,
      selectedOptionIndices: [],
    }
    const { isCorrect, pointsEarned, needsReview } = q
      ? gradeAnswer(q, submitted)
      : { isCorrect: false, pointsEarned: 0, needsReview: false }
    // totalPoints always includes manual questions so the score can reach 100
    // once the tutor has graded them.
    totalPoints += Number(q?.points ?? 0)
    earnedPoints += pointsEarned
    if (needsReview) pendingManualGrading = true
    return {
      question: qid,
      selectedOptions: (submitted.selectedOptionIndices || []).map((idx) => ({ optionIndex: idx })),
      textAnswer: submitted.textAnswer || '',
      isCorrect,
      pointsEarned,
    }
  })

  // Score/passed at submit time reflect only the auto-graded points out of the
  // full total. When manual questions are pending, this is a provisional score
  // that will be recomputed by the manual-grading endpoint.
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
    pendingManualGrading,
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

  const tutorLink =
    classId && assessmentId
      ? `/dashboard/tutor/classes/${classId}/assessments/${assessmentId}`
      : `/dashboard/tutor/assessments/${tutorAssessmentId}`

  if (tutorId) {
    await createNotification({
      recipientId: String(tutorId),
      type: 'assessment_completed',
      title: 'Assessment Completed',
      message: pendingManualGrading
        ? `${studentName} completed "${assessmentTitle}". Some answers need your grading.`
        : `${studentName} completed "${assessmentTitle}" with a score of ${score}%.`,
      link: tutorLink,
      relatedCollection: 'tutor-assessments',
      relatedId: String(tutorAssessmentId),
    })
  }

  createActivityLogs([
    {
      subjectId: user.id,
      actorId: user.id,
      type: 'assessment_completed',
      title: `Completed ${assessmentTitle}`,
      description: `Scored ${score}% (${passed ? 'passed' : 'did not pass'}).`,
      link: `/dashboard/student/assessments/${tutorAssessmentId}`,
      relatedCollection: 'assessment-results',
      relatedId: String((result as any).id),
      metadata: { score, passed, tutorAssessmentId },
    },
    {
      subjectId: tutorId,
      actorId: user.id,
      type: 'assessment_completed',
      title: `${studentName} completed "${assessmentTitle}"`,
      description: `Scored ${score}% (${passed ? 'passed' : 'did not pass'}).`,
      link: tutorLink,
      relatedCollection: 'assessment-results',
      relatedId: String((result as any).id),
      metadata: { score, passed, studentId: user.id, tutorAssessmentId },
    },
  ]).catch(() => {})

  if (tutorId) {
    try {
      const tutorUser = await payload.findByID({
        collection: 'users',
        id: tutorId,
        depth: 0,
      })
      const tutorEmail = (tutorUser as any)?.email
      if (tutorEmail) {
        const serverUrl = getEmailServerUrl(headers)
        const tutorFirstName = (tutorUser as any)?.firstName || 'there'
        const emailContent = `
          <p class="text">Hi ${tutorFirstName},</p>
          <p class="text"><strong>${studentName}</strong> just completed <strong>"${assessmentTitle}"</strong>.</p>
          <p class="text">Score: <strong>${score}%</strong> — ${passed ? 'Passed' : 'Did not pass'}.</p>
          <div class="btn-container">
            <a href="${serverUrl}${tutorLink}" class="btn">View Results</a>
          </div>
        `
        const html = getBaseEmailLayout('Assessment Completed', emailContent, serverUrl)
        await sendEmail({
          to: tutorEmail,
          subject: `${studentName} completed ${assessmentTitle}`,
          html,
        })
      }
    } catch (mailErr) {
      console.error('[assessments/submit] Failed to email tutor:', mailErr)
    }
  }

  return NextResponse.json({ success: true, result })
}

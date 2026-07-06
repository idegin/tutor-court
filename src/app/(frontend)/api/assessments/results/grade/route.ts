import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

type IncomingGrade = {
  questionId: string | number
  pointsEarned: number
  isCorrect: boolean
}

/**
 * POST – a tutor manually grades the short-answer/essay answers on a submitted
 * result. Recomputes the score/passed state and clears the pending-grading flag.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can grade assessments.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const rawId = body?.resultId
  const grades: IncomingGrade[] = Array.isArray(body?.grades) ? body.grades : []
  const feedback: string | undefined =
    typeof body?.feedback === 'string' ? body.feedback : undefined

  if (!rawId) {
    return NextResponse.json({ error: 'resultId is required.' }, { status: 400 })
  }
  const resultId = typeof rawId === 'string' && /^\d+$/.test(rawId) ? Number(rawId) : rawId

  let result: any
  try {
    result = await payload.findByID({
      collection: 'assessment-results',
      id: resultId,
      depth: 2,
    })
  } catch {
    return NextResponse.json({ error: 'Result not found.' }, { status: 404 })
  }

  const tutorId = typeof result.tutor === 'object' ? result.tutor?.id : result.tutor
  if (String(tutorId) !== String(user.id)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const gradeByQuestion = new Map<string, IncomingGrade>(
    grades.map((g) => [String(g.questionId), g]),
  )

  // Determine the passing score from the assessment definition.
  let passingScore = 70
  try {
    const taId =
      typeof result.tutorAssessment === 'object'
        ? result.tutorAssessment?.id
        : result.tutorAssessment
    const ta =
      typeof result.tutorAssessment === 'object'
        ? result.tutorAssessment
        : taId
          ? await payload.findByID({ collection: 'tutor-assessments', id: taId, depth: 1 })
          : null
    const assessment = ta && typeof ta.assessment === 'object' ? ta.assessment : null
    if (assessment && assessment.passingScore != null) {
      passingScore = Number(assessment.passingScore)
    }
  } catch {
    // fall back to default passing score
  }

  const existingAnswers: any[] = Array.isArray(result.answers) ? result.answers : []
  const updatedAnswers = existingAnswers.map((ans) => {
    const question = typeof ans.question === 'object' ? ans.question : null
    const questionId = question ? question.id : ans.question
    const g = gradeByQuestion.get(String(questionId))
    if (!g) {
      // Keep existing grading for questions not included in this request.
      return {
        question: questionId,
        selectedOptions: (ans.selectedOptions || []).map((o: any) => ({
          optionIndex: o.optionIndex,
        })),
        textAnswer: ans.textAnswer || '',
        isCorrect: Boolean(ans.isCorrect),
        pointsEarned: Number(ans.pointsEarned ?? 0),
      }
    }
    const maxPoints = Number(question?.points ?? 0)
    const clamped = Math.max(0, Math.min(maxPoints, Number(g.pointsEarned) || 0))
    return {
      question: questionId,
      selectedOptions: (ans.selectedOptions || []).map((o: any) => ({
        optionIndex: o.optionIndex,
      })),
      textAnswer: ans.textAnswer || '',
      isCorrect: Boolean(g.isCorrect),
      pointsEarned: clamped,
    }
  })

  const totalPoints = Number(result.totalPoints ?? 0)
  const earnedPoints = updatedAnswers.reduce((acc, a) => acc + Number(a.pointsEarned ?? 0), 0)
  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
  const passed = score >= passingScore

  const updated = await payload.update({
    collection: 'assessment-results',
    id: resultId,
    overrideAccess: true,
    context: { grading: true },
    data: {
      answers: updatedAnswers,
      earnedPoints,
      score,
      passed,
      pendingManualGrading: false,
      ...(feedback !== undefined ? { feedback } : {}),
    } as any,
  })

  return NextResponse.json({ success: true, result: updated })
}

import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// Postgres integer PKs: a stringified relationship id fails on create/update.
const numericId = (v: any) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v)

const relTutorId = (assessment: any) =>
  assessment && typeof assessment.tutor === 'object' ? assessment.tutor?.id : assessment?.tutor

/** Load a question with its assessment and assert the caller owns it. */
async function loadOwnedQuestion(payload: any, questionId: any, user: any) {
  const question = await payload
    .findByID({ collection: 'assessment-questions', id: questionId, depth: 1 })
    .catch(() => null)
  if (!question) return { error: 'Question not found.', status: 404 as const }
  const tutorId = relTutorId(question.assessment)
  if (user.accountType !== 'admin' && String(tutorId) !== String(user.id)) {
    return { error: 'Forbidden.', status: 403 as const }
  }
  return { question }
}

// GET – list questions for an assessment
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const assessmentId = searchParams.get('assessmentId')

  if (!assessmentId) {
    return NextResponse.json({ error: 'assessmentId is required.' }, { status: 400 })
  }

  const result = await payload.find({
    collection: 'assessment-questions',
    where: { assessment: { equals: assessmentId } },
    sort: 'order',
    limit: 100,
    depth: 0,
  })

  // Only the owning tutor (or an admin) may see the answer key. For anyone
  // else, strip `isCorrect` from the options so students can't read the
  // answers by calling this endpoint directly.
  const assessment = await payload
    .findByID({ collection: 'assessments', id: assessmentId, depth: 0 })
    .catch(() => null)
  const tutorId = relTutorId(assessment)
  const isOwner = user.accountType === 'admin' || String(tutorId) === String(user.id)

  if (!isOwner) {
    result.docs = result.docs.map((q: any) => ({
      ...q,
      options: Array.isArray(q.options)
        ? q.options.map((o: any) => ({ optionText: o.optionText }))
        : q.options,
    }))
  }

  return NextResponse.json(result)
}

// POST – add a question to an assessment
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can add questions.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { assessmentId, questionText, type, options, points, explanation, order } = body

  if (!assessmentId || !questionText || !type) {
    return NextResponse.json({ error: 'assessmentId, questionText, and type are required.' }, { status: 400 })
  }

  // Choice-based questions are auto-graded, so they must have a correct option.
  // Short-answer/essay questions are graded manually and carry no options.
  const CHOICE_TYPES = ['single_choice', 'multiple_choice', 'true_false']
  const opts: { optionText: string; isCorrect?: boolean }[] = options || []
  if (CHOICE_TYPES.includes(type)) {
    const hasCorrect = opts.some((o) => o.isCorrect === true)
    if (!hasCorrect) {
      return NextResponse.json({ error: 'At least one option must be marked as correct.' }, { status: 400 })
    }
  }

  // Verify ownership
  const assessment = await payload.findByID({
    collection: 'assessments',
    id: assessmentId,
    depth: 0,
  })

  const tutorId = relTutorId(assessment)

  if (String(tutorId) !== String(user.id)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const question = await payload.create({
    collection: 'assessment-questions',
    data: {
      assessment: numericId(assessmentId),
      questionText,
      type,
      options: options || [],
      points: points ?? 1,
      explanation: explanation || '',
      order: order ?? 0,
    } as any,
  })

  return NextResponse.json({ success: true, question })
}

// PATCH – update a question
export async function PATCH(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { questionId, ...updates } = body
  if (!questionId) {
    return NextResponse.json({ error: 'questionId is required.' }, { status: 400 })
  }

  const owned = await loadOwnedQuestion(payload, questionId, user)
  if ('error' in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status })
  }

  // Never allow the assessment relationship to be reassigned via PATCH.
  delete (updates as any).assessment

  const updated = await payload.update({
    collection: 'assessment-questions',
    id: questionId,
    data: updates as any,
    overrideAccess: true,
  })

  return NextResponse.json({ success: true, question: updated })
}

// DELETE – remove a question
export async function DELETE(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const questionId = searchParams.get('questionId')
  if (!questionId) {
    return NextResponse.json({ error: 'questionId is required.' }, { status: 400 })
  }

  const owned = await loadOwnedQuestion(payload, questionId, user)
  if ('error' in owned) {
    return NextResponse.json({ error: owned.error }, { status: owned.status })
  }

  await payload.delete({ collection: 'assessment-questions', id: questionId, overrideAccess: true })
  return NextResponse.json({ success: true })
}

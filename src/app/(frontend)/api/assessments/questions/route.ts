import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

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
  try { body = await request.json() } catch {
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
    const hasCorrect = opts.some(o => o.isCorrect === true)
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

  const tutorId = typeof (assessment as any).tutor === 'object'
    ? (assessment as any).tutor.id
    : (assessment as any).tutor

  if (tutorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const question = await payload.create({
    collection: 'assessment-questions',
    data: {
      assessment: assessmentId,
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
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { questionId, ...updates } = body
  if (!questionId) {
    return NextResponse.json({ error: 'questionId is required.' }, { status: 400 })
  }

  const updated = await payload.update({
    collection: 'assessment-questions',
    id: questionId,
    data: updates as any,
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

  await payload.delete({ collection: 'assessment-questions', id: questionId })
  return NextResponse.json({ success: true })
}

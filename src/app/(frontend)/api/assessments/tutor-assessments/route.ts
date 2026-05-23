import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { createNotification } from '@/lib/notification-service'

// GET – list tutor assessments sent by tutor or received by student
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('classId')
  const studentId = searchParams.get('studentId')

  const whereConditions: any[] = []

  if (user.accountType === 'tutor') {
    whereConditions.push({ tutor: { equals: user.id } })
  } else if (user.accountType === 'student') {
    whereConditions.push({ student: { equals: user.id } })
  }

  if (classId) whereConditions.push({ class: { equals: classId } })
  if (studentId) whereConditions.push({ student: { equals: studentId } })

  const result = await payload.find({
    collection: 'tutor-assessments',
    where: whereConditions.length > 0 ? { and: whereConditions } : undefined,
    sort: '-createdAt',
    limit: 50,
    depth: 2,
  })

  return NextResponse.json(result)
}

// POST – tutor sends an assessment to a student
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can send assessments.' }, { status: 403 })
  }

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { assessmentId, studentId, classId, selectedQuestionIds, dueDate, instructions } = body

  if (!assessmentId || !studentId || !classId) {
    return NextResponse.json(
      { error: 'assessmentId, studentId, and classId are required.' },
      { status: 400 },
    )
  }

  const tutorAssessment = await payload.create({
    collection: 'tutor-assessments',
    data: {
      assessment: assessmentId,
      tutor: user.id,
      student: studentId,
      class: classId,
      selectedQuestions: selectedQuestionIds || [],
      status: 'pending',
      dueDate: dueDate || null,
      instructions: instructions || '',
    } as any,
  })

  // Fetch assessment title for notification
  const assessment = await payload.findByID({
    collection: 'assessments',
    id: assessmentId,
    depth: 0,
  })

  const student = await payload.findByID({
    collection: 'users',
    id: studentId,
    depth: 0,
  })

  const assessmentTitle = (assessment as any)?.title || 'an assessment'
  const tutorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email

  // Notify the student
  await createNotification({
    recipientId: studentId,
    type: 'assessment_sent',
    title: 'New Assessment Assigned',
    message: `${tutorName} has assigned you "${assessmentTitle}". Please complete it before the deadline.`,
    link: `/dashboard/student/assessments/${tutorAssessment.id}`,
    relatedCollection: 'tutor-assessments',
    relatedId: tutorAssessment.id,
  })

  return NextResponse.json({ success: true, tutorAssessment })
}

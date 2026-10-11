import { NextResponse } from 'next/server'
import { getRouteUser } from '@/lib/auth'
import { sessionExpiredResponse } from '@/lib/auth-response'
import { createNotification, notifyParent } from '@/lib/notification-service'
import { createActivityLogs } from '@/lib/activity-log-service'

// GET – list tutor assessments sent by tutor or received by student
export async function GET(request: Request) {
  const { user, payload } = await getRouteUser()

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
  const { user, payload } = await getRouteUser()

  if (!user) {
    return sessionExpiredResponse()
  }
  if (user.accountType !== 'tutor') {
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
    relatedId: String(tutorAssessment.id),
  })

  const studentName = `${(student as any)?.firstName || ''} ${(student as any)?.lastName || ''}`.trim() || (student as any)?.email

  // Notify the parent
  const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString() : 'no deadline'
  notifyParent(studentId, {
    type: 'assessment_sent',
    title: 'New Assessment Assigned',
    message: `${tutorName} has assigned ${(student as any)?.firstName || 'your child'} a new assessment: "${assessmentTitle}". Due: ${dueDateStr}.`,
    link: `/dashboard/parent/students/${studentId}/assessments/${tutorAssessment.id}`,
    relatedCollection: 'tutor-assessments',
    relatedId: String(tutorAssessment.id),
  }).catch(() => {})
  createActivityLogs([
    {
      subjectId: studentId,
      actorId: user.id,
      type: 'assessment_assigned',
      title: `New assessment assigned: ${assessmentTitle}`,
      description: `${tutorName} assigned this assessment${dueDate ? `, due ${new Date(dueDate).toLocaleDateString()}` : ''}.`,
      link: `/dashboard/student/assessments/${tutorAssessment.id}`,
      relatedCollection: 'tutor-assessments',
      relatedId: String(tutorAssessment.id),
      metadata: { classId, assessmentId, dueDate: dueDate || null },
    },
    {
      subjectId: user.id,
      actorId: user.id,
      type: 'assessment_assigned',
      title: `Assigned "${assessmentTitle}" to ${studentName}`,
      description: dueDate ? `Due ${new Date(dueDate).toLocaleDateString()}.` : 'No due date set.',
      link: `/dashboard/tutor/assessments/${tutorAssessment.id}`,
      relatedCollection: 'tutor-assessments',
      relatedId: String(tutorAssessment.id),
      metadata: { classId, assessmentId, studentId, dueDate: dueDate || null },
    },
  ]).catch(() => {})

  return NextResponse.json({ success: true, tutorAssessment })
}

import { headers as getHeaders } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { HiOutlineChevronLeft } from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { AssessmentDetail } from '@/components/assessments/assessment-detail'
import { TakeAssessment, TakeQuestion } from '@/components/assessments/take-assessment'

export default async function StudentAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'student') {
    redirect('/auth/login')
  }

  const { id } = await params

  let tutorAssessment: any
  try {
    tutorAssessment = await payload.findByID({
      collection: 'tutor-assessments',
      id,
      depth: 2,
    })
  } catch {
    notFound()
  }

  if (!tutorAssessment) notFound()

  const studentId =
    typeof tutorAssessment.student === 'object'
      ? tutorAssessment.student?.id
      : tutorAssessment.student

  if (studentId !== user.id) {
    redirect('/dashboard/student/assessments')
  }

  const resultData = await payload.find({
    collection: 'assessment-results',
    where: { tutorAssessment: { equals: id } },
    depth: 2,
    limit: 1,
  })

  const result = resultData.docs[0] as any | undefined
  const isSubmitted = Boolean(result?.submittedAt)
  const assessment =
    typeof tutorAssessment.assessment === 'object' ? tutorAssessment.assessment : null

  // Strip answer keys from selectedQuestions before sending to the take-flow client
  const safeQuestions: TakeQuestion[] = isSubmitted
    ? []
    : ((tutorAssessment.selectedQuestions || []) as any[])
        .filter((q) => typeof q === 'object' && q)
        .map((q) => ({
          id: String(q.id),
          questionText: String(q.questionText || ''),
          type: q.type as TakeQuestion['type'],
          points: Number(q.points ?? 1),
          options: (Array.isArray(q.options) ? q.options : []).map((o: any) => ({
            optionText: String(o?.optionText || ''),
          })),
        }))

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
      <div>
        <Link href="/dashboard/student/assessments">
          <Button
            variant="ghost"
            size="sm"
            className="flex cursor-pointer items-center gap-1.5 text-muted-foreground"
          >
            <HiOutlineChevronLeft className="h-4 w-4" />
            Back to assessments
          </Button>
        </Link>
      </div>

      {isSubmitted ? (
        <AssessmentDetail tutorAssessment={tutorAssessment} result={result as any} />
      ) : (
        <TakeAssessment
          tutorAssessmentId={String(tutorAssessment.id)}
          assessmentTitle={assessment?.title || 'Assessment'}
          assessmentDescription={assessment?.description}
          instructions={tutorAssessment.instructions}
          timeLimitMinutes={Number(assessment?.timeLimitMinutes || 0)}
          passingScore={Number(assessment?.passingScore ?? 70)}
          status={tutorAssessment.status}
          questions={safeQuestions}
          startedAt={result?.createdAt || null}
        />
      )}
    </div>
  )
}

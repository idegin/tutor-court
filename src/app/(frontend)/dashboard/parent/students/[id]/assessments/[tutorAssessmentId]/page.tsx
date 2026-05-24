import Link from 'next/link'
import { headers as getHeaders } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { HiOutlineChevronLeft } from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { AssessmentDetail } from '@/components/assessments/assessment-detail'

export default async function ParentChildAssessmentPerformancePage({
  params,
}: {
  params: Promise<{ id: string; tutorAssessmentId: string }>
}) {
  const { id: studentId, tutorAssessmentId } = await params

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'parent') {
    redirect('/auth/login')
  }

  // Verify the child belongs to this parent.
  let child: any
  try {
    child = await payload.findByID({ collection: 'users', id: studentId, depth: 0 })
  } catch {
    notFound()
  }
  if (!child || String(child.parent) !== String(user.id)) {
    redirect('/dashboard/parent')
  }

  let tutorAssessment: any
  try {
    tutorAssessment = await payload.findByID({
      collection: 'tutor-assessments',
      id: tutorAssessmentId,
      depth: 2,
    })
  } catch {
    notFound()
  }
  if (!tutorAssessment) notFound()

  const taStudentId =
    typeof tutorAssessment.student === 'object'
      ? tutorAssessment.student?.id
      : tutorAssessment.student
  if (String(taStudentId) !== String(studentId)) {
    redirect(`/dashboard/parent/students/${studentId}`)
  }

  const resultRes = await payload.find({
    collection: 'assessment-results',
    where: { tutorAssessment: { equals: tutorAssessmentId } },
    depth: 2,
    limit: 1,
  })
  const result = resultRes.docs[0] as any | undefined

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6">
      <div>
        <Link href={`/dashboard/parent/students/${studentId}`}>
          <Button
            variant="ghost"
            size="sm"
            className="flex cursor-pointer items-center gap-1.5 text-muted-foreground"
          >
            <HiOutlineChevronLeft className="h-4 w-4" />
            Back to {child.firstName || 'student'}
          </Button>
        </Link>
      </div>

      {result?.submittedAt ? (
        <AssessmentDetail tutorAssessment={tutorAssessment} result={result} />
      ) : (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
          <p className="text-base font-semibold">Not completed yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {child.firstName || 'Your child'} has not submitted this assessment yet. Results will appear here
            once they do.
          </p>
        </div>
      )}
    </div>
  )
}

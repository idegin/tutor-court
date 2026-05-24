import { headers as getHeaders } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { HiOutlineChevronLeft } from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { AssessmentDetail } from '@/components/assessments/assessment-detail'

export default async function TutorAssessmentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const payload = await getPayload({ config })
    const headers = await getHeaders()
    const { user } = await payload.auth({ headers })

    if (!user || user.accountType !== 'tutor') {
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

    const tutorId =
        typeof tutorAssessment.tutor === 'object'
            ? tutorAssessment.tutor?.id
            : tutorAssessment.tutor

    if (tutorId !== user.id) {
        redirect('/dashboard/tutor/assessments')
    }

    const resultData = await payload.find({
        collection: 'assessment-results',
        where: { tutorAssessment: { equals: id } },
        depth: 2,
        limit: 1,
    })

    const result = resultData.docs[0] ?? undefined

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            <div>
                <Link href="/dashboard/tutor/assessments">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1.5 text-muted-foreground cursor-pointer"
                    >
                        <HiOutlineChevronLeft className="h-4 w-4" />
                        Back to Assessments
                    </Button>
                </Link>
            </div>

            <AssessmentDetail tutorAssessment={tutorAssessment} result={result as any} />
        </div>
    )
}

import Link from 'next/link'
import { headers as getHeaders } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  HiOutlineChevronLeft,
  HiOutlineClipboardDocumentList,
  HiOutlineUsers,
  HiOutlineCheckCircle,
  HiOutlineTrophy,
  HiOutlineClock,
  HiOutlineArrowRight,
} from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  expired: 'Expired',
}

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export default async function AssessmentPerformancePage({
  params,
}: {
  params: Promise<{ id: string; assessmentId: string }>
}) {
  const { id: classId, assessmentId } = await params

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    redirect('/auth/login')
  }

  // Verify the tutor owns this class
  let cls: any
  try {
    cls = await payload.findByID({ collection: 'classes', id: classId, depth: 0 })
  } catch {
    notFound()
  }
  if (!cls) notFound()
  const classTutorId = typeof cls.tutor === 'object' ? cls.tutor?.id : cls.tutor
  if (classTutorId !== user.id) {
    redirect('/dashboard/tutor/classes')
  }

  let assessment: any
  try {
    assessment = await payload.findByID({ collection: 'assessments', id: assessmentId, depth: 1 })
  } catch {
    notFound()
  }
  if (!assessment) notFound()
  const assessmentTutorId = typeof assessment.tutor === 'object' ? assessment.tutor?.id : assessment.tutor
  if (assessmentTutorId !== user.id) {
    redirect(`/dashboard/tutor/classes/${classId}`)
  }

  const assignmentsRes = await payload.find({
    collection: 'tutor-assessments',
    where: {
      and: [
        { class: { equals: classId } },
        { assessment: { equals: assessmentId } },
        { tutor: { equals: user.id } },
      ],
    },
    sort: '-createdAt',
    limit: 200,
    depth: 2,
  })

  const assignments = assignmentsRes.docs as any[]
  const taIds = assignments.map((a) => a.id)

  const resultsRes = taIds.length
    ? await payload.find({
        collection: 'assessment-results',
        where: { tutorAssessment: { in: taIds } },
        limit: 500,
        depth: 0,
      })
    : { docs: [] }

  const resultByTaId = new Map<string, any>()
  for (const r of resultsRes.docs as any[]) {
    if (!r.submittedAt) continue
    const taId = typeof r.tutorAssessment === 'object' ? r.tutorAssessment?.id : r.tutorAssessment
    if (taId) resultByTaId.set(String(taId), r)
  }

  const rows = assignments.map((ta) => {
    const student = typeof ta.student === 'object' ? ta.student : null
    const result = resultByTaId.get(String(ta.id))
    return {
      taId: String(ta.id),
      studentId: student?.id ? String(student.id) : '',
      studentName: student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : 'Student',
      studentEmail: student?.email || '',
      status: ta.status as string,
      dueDate: ta.dueDate as string | null,
      result,
    }
  })

  const completedCount = rows.filter((r) => r.status === 'completed' && r.result).length
  const submitted = rows.filter((r) => r.result)
  const passedCount = submitted.filter((r) => r.result.passed).length
  const avgScore = submitted.length
    ? Math.round(submitted.reduce((acc, r) => acc + (r.result.score || 0), 0) / submitted.length)
    : 0

  const subjectName =
    typeof assessment.subject === 'object' ? assessment.subject?.name : undefined

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6">
      <div>
        <Link href={`/dashboard/tutor/classes/${classId}`}>
          <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
            <HiOutlineChevronLeft className="h-4 w-4" />
            Back to class
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tutor-purple-100 text-tutor-purple-700">
                <HiOutlineClipboardDocumentList className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">{assessment.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1">
                  <span className="capitalize">{String(assessment.type || '').replace('_', ' ')}</span>
                  {subjectName && (
                    <>
                      <span>·</span>
                      <span>{subjectName}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>Class: {cls.title}</span>
                  <span>·</span>
                  <span>Passing {assessment.passingScore ?? 70}%</span>
                </div>
                {assessment.description && (
                  <p className="text-sm text-muted-foreground mt-2">{assessment.description}</p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={<HiOutlineUsers className="h-4 w-4" />} label="Assigned" value={rows.length.toString()} />
            <Stat icon={<HiOutlineCheckCircle className="h-4 w-4" />} label="Completed" value={`${completedCount}/${rows.length}`} />
            <Stat icon={<HiOutlineTrophy className="h-4 w-4" />} label="Passed" value={`${passedCount}/${submitted.length}`} />
            <Stat icon={<HiOutlineClock className="h-4 w-4" />} label="Avg score" value={submitted.length ? `${avgScore}%` : '—'} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student performance</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              No students have been assigned this assessment yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-semibold">Student</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 font-semibold">Score</th>
                    <th className="py-2 pr-4 font-semibold">Pass</th>
                    <th className="py-2 pr-4 font-semibold">Submitted</th>
                    <th className="py-2 pr-4 font-semibold">Time</th>
                    <th className="py-2 pr-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => {
                    const r = row.result
                    return (
                      <tr key={row.taId} className="hover:bg-muted/30">
                        <td className="py-3 pr-4">
                          <div className="flex flex-col">
                            <span className="font-semibold">{row.studentName}</span>
                            {row.studentEmail && (
                              <span className="text-xs text-muted-foreground">{row.studentEmail}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              STATUS_STYLES[row.status] || ''
                            }`}
                          >
                            {STATUS_LABELS[row.status] || row.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-bold">
                          {r ? `${Math.round(r.score || 0)}%` : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          {r ? (
                            <span className={r.passed ? 'text-emerald-600' : 'text-red-600'}>
                              {r.passed ? 'Passed' : 'Failed'}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {r?.submittedAt
                            ? new Date(r.submittedAt).toLocaleDateString()
                            : row.dueDate
                              ? `Due ${new Date(row.dueDate).toLocaleDateString()}`
                              : '—'}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {formatTime(r?.timeTakenSeconds || 0)}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <Link
                            href={`/dashboard/tutor/assessments/${row.taId}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-tutor-purple-700 hover:underline"
                          >
                            Details <HiOutlineArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

import Link from 'next/link'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineArrowRight,
  HiOutlineSparkles,
  HiOutlineBookOpen,
  HiOutlineTrophy,
} from 'react-icons/hi2'

export const metadata = {
  title: 'Assessments | Student Dashboard',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  expired: 'Expired',
}

export default async function StudentAssessmentsPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const [tutorAssessmentsRes, resultsRes] = await Promise.all([
    payload.find({
      collection: 'tutor-assessments',
      where: { student: { equals: user!.id } },
      sort: '-createdAt',
      limit: 50,
      depth: 2,
    }),
    payload.find({
      collection: 'assessment-results',
      where: { student: { equals: user!.id } },
      sort: '-submittedAt',
      limit: 50,
      depth: 2,
    }),
  ])

  const all = tutorAssessmentsRes.docs as any[]
  const pending = all.filter((a) => a.status === 'pending' || a.status === 'in_progress')
  const completed = all.filter((a) => a.status === 'completed')
  const expired = all.filter((a) => a.status === 'expired')

  const results = resultsRes.docs as any[]
  const submittedResults = results.filter((r) => r.submittedAt)
  const passed = submittedResults.filter((r) => r.passed)
  const avgScore =
    submittedResults.length === 0
      ? 0
      : Math.round(
          submittedResults.reduce((acc, r) => acc + (r.score || 0), 0) / submittedResults.length,
        )

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-tutor-purple-600">Assessments</p>
        <h1 className="text-3xl font-bold tracking-tight">Your assessments</h1>
        <p className="text-muted-foreground">
          Quizzes and homework from your tutors. Complete them to track your progress.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="To complete"
          value={pending.length.toString()}
          icon={<HiOutlineSparkles className="h-5 w-5" />}
          accent="text-amber-700 bg-amber-50"
        />
        <StatCard
          label="Completed"
          value={completed.length.toString()}
          icon={<HiOutlineCheckCircle className="h-5 w-5" />}
          accent="text-emerald-700 bg-emerald-50"
        />
        <StatCard
          label="Passed"
          value={passed.length.toString()}
          icon={<HiOutlineTrophy className="h-5 w-5" />}
          accent="text-tutor-purple-700 bg-tutor-purple-50"
        />
        <StatCard
          label="Avg score"
          value={submittedResults.length === 0 ? '—' : `${avgScore}%`}
          icon={<HiOutlineBookOpen className="h-5 w-5" />}
          accent="text-blue-700 bg-blue-50"
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">To complete</h2>
          <span className="text-xs text-muted-foreground">
            {pending.length} {pending.length === 1 ? 'assessment' : 'assessments'}
          </span>
        </div>
        {pending.length === 0 ? (
          <EmptyState
            title="You're all caught up!"
            description="No pending assessments. Your tutors will assign new ones here."
          />
        ) : (
          <div className="space-y-3">
            {pending.map((a) => (
              <AssessmentRow key={a.id} assessment={a} />
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Recently completed</h2>
            <span className="text-xs text-muted-foreground">
              {completed.length} {completed.length === 1 ? 'assessment' : 'assessments'}
            </span>
          </div>
          <div className="space-y-3">
            {completed.map((a) => {
              const result = submittedResults.find(
                (r) => (typeof r.tutorAssessment === 'object' ? r.tutorAssessment?.id : r.tutorAssessment) === a.id,
              )
              return <AssessmentRow key={a.id} assessment={a} result={result} />
            })}
          </div>
        </section>
      )}

      {expired.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Expired</h2>
            <span className="text-xs text-muted-foreground">
              {expired.length} {expired.length === 1 ? 'assessment' : 'assessments'}
            </span>
          </div>
          <div className="space-y-3">
            {expired.map((a) => (
              <AssessmentRow key={a.id} assessment={a} muted />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function AssessmentRow({
  assessment,
  result,
  muted,
}: {
  assessment: any
  result?: any
  muted?: boolean
}) {
  const assessmentDoc =
    typeof assessment.assessment === 'object' ? assessment.assessment : null
  const title = assessmentDoc?.title || 'Assessment'
  const subject =
    typeof assessmentDoc?.subject === 'object' ? assessmentDoc.subject?.name : null
  const tutor = typeof assessment.tutor === 'object' ? assessment.tutor : null
  const tutorName = tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Tutor'
  const type = assessmentDoc?.type || 'quiz'
  const dueDate = assessment.dueDate ? new Date(assessment.dueDate) : null
  const now = new Date()
  const isOverdue = dueDate && dueDate < now && assessment.status !== 'completed'

  const statusClass = STATUS_STYLES[assessment.status] || 'bg-secondary text-secondary-foreground'
  const statusLabel = STATUS_LABELS[assessment.status] || assessment.status

  return (
    <Link
      href={`/dashboard/student/assessments/${assessment.id}`}
      className={`group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-tutor-purple-300 sm:flex-row sm:items-center sm:justify-between ${
        muted ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tutor-purple-100 text-tutor-purple-700">
          <HiOutlineClipboardDocumentList className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold leading-tight">{title}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="capitalize">{type.replace('_', ' ')}</span>
            {subject && (
              <>
                <span>·</span>
                <span>{subject}</span>
              </>
            )}
            <span>·</span>
            <span>From {tutorName}</span>
          </div>
          {assessment.instructions && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {assessment.instructions}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {result && (
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-1.5">
            <HiOutlineTrophy
              className={`h-4 w-4 ${result.passed ? 'text-emerald-600' : 'text-amber-600'}`}
            />
            <span className="text-sm font-bold">{Math.round(result.score || 0)}%</span>
          </div>
        )}
        {dueDate && !result && (
          <div
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
              isOverdue ? 'bg-red-50 text-red-700' : 'bg-muted/40 text-muted-foreground'
            }`}
          >
            {isOverdue ? (
              <HiOutlineExclamationCircle className="h-4 w-4" />
            ) : (
              <HiOutlineClock className="h-4 w-4" />
            )}
            <span>
              {isOverdue ? 'Overdue' : `Due ${dueDate.toLocaleDateString()}`}
            </span>
          </div>
        )}
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusClass}`}
        >
          {statusLabel}
        </span>
        <HiOutlineArrowRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
      </div>
    </Link>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      </div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <HiOutlineCheckCircle className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

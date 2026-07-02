import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import {
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineUserCircle,
  HiOutlineVideoCamera,
  HiOutlineSparkles,
  HiOutlineArrowRight,
  HiOutlineBookOpen,
  HiOutlineAcademicCap,
  HiOutlineTrophy,
  HiOutlineClock,
} from 'react-icons/hi2'
import { Button } from '@/components/ui/button'
import { getUpcomingClasses } from '@/lib/class-schedule'

export const metadata = {
  title: 'Overview | Student Dashboard',
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function StudentOverviewPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const [classesRes, tutorAssessmentsRes, resultsRes] = await Promise.all([
    payload.find({
      collection: 'classes',
      where: { students: { equals: user!.id } },
      sort: 'startDate',
      limit: 50,
      depth: 2,
    }),
    payload.find({
      collection: 'tutor-assessments',
      where: { student: { equals: user!.id } },
      sort: '-createdAt',
      limit: 20,
      depth: 2,
    }),
    payload.find({
      collection: 'assessment-results',
      where: { student: { equals: user!.id } },
      sort: '-submittedAt',
      limit: 20,
      depth: 1,
    }),
  ])

  // Only classes with a future occurrence (drops ended series), soonest first.
  const upcoming = getUpcomingClasses(classesRes.docs as any[])
  const pendingAssessments = (tutorAssessmentsRes.docs as any[]).filter(
    (a) => a.status === 'pending' || a.status === 'in_progress',
  )
  const completedAssessments = (tutorAssessmentsRes.docs as any[]).filter(
    (a) => a.status === 'completed',
  )

  const results = resultsRes.docs as any[]
  const avgScore =
    results.length === 0
      ? 0
      : Math.round(results.reduce((acc, r) => acc + (r.score || 0), 0) / results.length)

  const tutorCount = new Set(
    classesRes.docs.map((c: any) => (typeof c.tutor === 'object' ? c.tutor?.id : c.tutor)),
  ).size

  const subjectsOfInterest = ((user as any)?.subjectsOfInterest || []) as any[]

  const firstName = user!.firstName
  const greeting = getGreeting()

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-tutor-purple-600 via-tutor-purple-500 to-tutor-purple-700 p-6 text-white shadow-lg md:p-8">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -ml-32 -mb-32 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold uppercase tracking-wider text-white/80">
              {greeting}
            </p>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Welcome back, {firstName}
            </h1>
            <p className="max-w-xl text-sm text-white/80 md:text-base">
              {pendingAssessments.length > 0
                ? `You have ${pendingAssessments.length} assessment${pendingAssessments.length === 1 ? '' : 's'} waiting for you.`
                : upcoming.length > 0
                  ? `You're enrolled in ${upcoming.length} class${upcoming.length === 1 ? '' : 'es'}. Keep learning!`
                  : 'Your learning journey starts here. Your tutors will set up classes for you soon.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcoming.length > 0 && (
              <Button
                asChild
                className="cursor-pointer bg-white font-semibold text-tutor-purple-700 hover:bg-white/90"
              >
                <Link href="/dashboard/student/classes" className="flex items-center gap-1.5">
                  View classes <HiOutlineArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {pendingAssessments.length > 0 && (
              <Button
                asChild
                variant="outline"
                className="cursor-pointer border-white/40 bg-white/10 font-semibold text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/dashboard/student/assessments" className="flex items-center gap-1.5">
                  Assessments
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Upcoming classes"
          value={upcoming.length.toString()}
          icon={<HiOutlineCalendarDays className="h-5 w-5" />}
          accent="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="To do"
          value={pendingAssessments.length.toString()}
          hint="assessments"
          icon={<HiOutlineSparkles className="h-5 w-5" />}
          accent="bg-amber-50 text-amber-700"
        />
        <StatCard
          label="My tutors"
          value={tutorCount.toString()}
          icon={<HiOutlineUserCircle className="h-5 w-5" />}
          accent="bg-tutor-purple-50 text-tutor-purple-700"
        />
        <StatCard
          label="Avg score"
          value={results.length === 0 ? '—' : `${avgScore}%`}
          hint={
            results.length === 0 ? 'No results yet' : `${completedAssessments.length} completed`
          }
          icon={<HiOutlineTrophy className="h-5 w-5" />}
          accent="bg-emerald-50 text-emerald-700"
        />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming classes */}
        <section className="lg:col-span-2 rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">Upcoming classes</h2>
              <p className="text-sm text-muted-foreground">
                Join when it's time for class.
              </p>
            </div>
            <Link
              href="/dashboard/student/classes"
              className="text-xs font-semibold text-tutor-purple-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<HiOutlineAcademicCap className="h-6 w-6" />}
              title="No upcoming classes"
              description="Your tutor will invite you to classes here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.slice(0, 5).map((cls: any) => {
                const tutor = typeof cls.tutor === 'object' ? cls.tutor : null
                const tutorName = tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Tutor'
                const subjectName =
                  typeof cls.subject === 'object' && cls.subject ? cls.subject.name : 'No subject'
                const days = (cls.schedule || [])
                  .map((s: any) => DAY_LABELS[s.day] || s.day)
                  .join(', ')
                const time = cls.schedule?.[0] ? `${cls.schedule[0].startTime}` : null
                const statusClass = STATUS_STYLES[cls.status] || 'bg-secondary text-secondary-foreground'
                return (
                  <li key={cls.id} className="relative group border-b last:border-b-0">
                    <Link
                      href={`/classroom/${cls.id}`}
                      className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-muted/10 sm:flex-row sm:items-center sm:justify-between w-full"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tutor-purple-100 text-tutor-purple-700">
                          <HiOutlineBookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-tutor-purple-600 transition-colors">{cls.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {subjectName} · with {tutorName}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <HiOutlineCalendarDays className="h-3 w-3" />
                              {days || 'No days set'}
                            </span>
                            {time && (
                              <span className="inline-flex items-center gap-1">
                                <HiOutlineClock className="h-3 w-3" />
                                {time}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusClass}`}
                        >
                          {cls.status}
                        </span>
                        <div
                          className="flex h-8 items-center gap-1.5 rounded-lg bg-tutor-purple-600 px-3 text-xs font-semibold text-white group-hover:bg-tutor-purple-700 transition-colors"
                        >
                          <HiOutlineVideoCamera className="h-4 w-4" />
                          Enter
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Right column */}
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Up next</h2>
                <p className="text-xs text-muted-foreground">Assessments to complete</p>
              </div>
              <Link
                href="/dashboard/student/assessments"
                className="text-xs font-semibold text-tutor-purple-600 hover:underline"
              >
                See all
              </Link>
            </div>
            {pendingAssessments.length === 0 ? (
              <EmptyState
                small
                icon={<HiOutlineClipboardDocumentList className="h-5 w-5" />}
                title="Nothing pending"
                description="You're all caught up."
              />
            ) : (
              <ul className="divide-y divide-border">
                {pendingAssessments.slice(0, 4).map((a) => {
                  const assessmentDoc =
                    typeof a.assessment === 'object' ? a.assessment : null
                  const title = assessmentDoc?.title || 'Assessment'
                  const due = a.dueDate ? new Date(a.dueDate) : null
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/dashboard/student/assessments/${a.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                          <HiOutlineClipboardDocumentList className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{title}</p>
                          <p className="text-xs text-muted-foreground">
                            {due ? `Due ${due.toLocaleDateString()}` : 'No due date'}
                          </p>
                        </div>
                        <HiOutlineArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border bg-card shadow-sm">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-semibold">My subjects</h2>
              <p className="text-xs text-muted-foreground">Your areas of interest</p>
            </div>
            <div className="p-5">
              {subjectsOfInterest.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No subjects selected yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subjectsOfInterest.map((s: any) => (
                    <span
                      key={typeof s === 'object' ? s.id : s}
                      className="inline-flex items-center gap-1 rounded-full bg-tutor-purple-50 px-3 py-1 text-xs font-semibold text-tutor-purple-700"
                    >
                      <HiOutlineBookOpen className="h-3 w-3" />
                      {typeof s === 'object' ? s.name : s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  small,
}: {
  icon: React.ReactNode
  title: string
  description: string
  small?: boolean
}) {
  return (
    <div className={`text-center ${small ? 'p-6' : 'p-10'}`}>
      <div
        className={`mx-auto flex items-center justify-center rounded-full bg-tutor-purple-50 text-tutor-purple-600 ${small ? 'h-9 w-9' : 'h-12 w-12'}`}
      >
        {icon}
      </div>
      <p className={`font-semibold ${small ? 'mt-3 text-xs' : 'mt-4 text-sm'}`}>{title}</p>
      <p className={`text-muted-foreground ${small ? 'mt-1 text-xs' : 'mt-1 text-sm'}`}>
        {description}
      </p>
    </div>
  )
}

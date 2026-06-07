import Link from 'next/link'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  HiOutlineAcademicCap,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineUserCircle,
  HiOutlineVideoCamera,
  HiOutlineBookOpen,
} from 'react-icons/hi2'

import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'My Classes | Student Dashboard',
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

export default async function StudentClassesPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const classesRes = await payload.find({
    collection: 'classes',
    where: { students: { equals: user!.id } },
    sort: '-startDate',
    limit: 50,
    depth: 2,
  })

  const allClasses = classesRes.docs
  const activeOrUpcoming = allClasses.filter(
    (c: any) => c.status !== 'completed' && c.status !== 'cancelled',
  )
  const past = allClasses.filter(
    (c: any) => c.status === 'completed' || c.status === 'cancelled',
  )

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-tutor-purple-600">My classes</p>
        <h1 className="text-3xl font-bold tracking-tight">All your classes</h1>
        <p className="text-muted-foreground">
          Everything your tutors have set up for you, in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total classes"
          value={allClasses.length.toString()}
          icon={<HiOutlineAcademicCap className="h-5 w-5" />}
        />
        <SummaryCard
          label="Active & upcoming"
          value={activeOrUpcoming.length.toString()}
          icon={<HiOutlineCalendarDays className="h-5 w-5" />}
        />
        <SummaryCard
          label="Tutors"
          value={new Set(
            allClasses.map((c: any) => (typeof c.tutor === 'object' ? c.tutor?.id : c.tutor)),
          ).size.toString()}
          icon={<HiOutlineUserCircle className="h-5 w-5" />}
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Active & upcoming</h2>
          <span className="text-xs text-muted-foreground">
            {activeOrUpcoming.length} {activeOrUpcoming.length === 1 ? 'class' : 'classes'}
          </span>
        </div>

        {activeOrUpcoming.length === 0 ? (
          <EmptyState
            title="No active classes yet"
            description="When a tutor schedules a class for you, it will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeOrUpcoming.map((cls: any) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Past classes</h2>
            <span className="text-xs text-muted-foreground">
              {past.length} {past.length === 1 ? 'class' : 'classes'}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {past.map((cls: any) => (
              <ClassCard key={cls.id} cls={cls} muted />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ClassCard({ cls, muted }: { cls: any; muted?: boolean }) {
  const tutor = typeof cls.tutor === 'object' ? cls.tutor : null
  const tutorName = tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Tutor'
  const subjectName =
    typeof cls.subject === 'object' && cls.subject ? cls.subject.name : 'No subject'
  const days = (cls.schedule || []).map((s: any) => DAY_LABELS[s.day] || s.day).join(', ')
  const time = cls.schedule?.[0]
    ? `${cls.schedule[0].startTime} – ${cls.schedule[0].endTime}`
    : null
  const statusClass = STATUS_STYLES[cls.status] || 'bg-secondary text-secondary-foreground'

  const tutorInitials = tutor
    ? `${tutor.firstName?.[0] || ''}${tutor.lastName?.[0] || ''}`.toUpperCase() || 'T'
    : 'T'

  const canEnter = cls.status === 'scheduled' || cls.status === 'active'

  return (
    <div
      className={`group relative flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md ${
        canEnter ? 'hover:border-tutor-purple-200' : ''
      } ${muted ? 'opacity-80' : ''}`}
    >
      {canEnter && (
        <Link
          href={`/classroom/${cls.id}`}
          className="absolute inset-0 z-0 rounded-2xl"
        />
      )}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tutor-purple-100 text-tutor-purple-700">
            <HiOutlineBookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight text-foreground group-hover:text-tutor-purple-600 transition-colors">{cls.title}</h3>
            <p className="text-xs text-muted-foreground">{subjectName}</p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusClass}`}
        >
          {cls.status}
        </span>
      </div>

      {cls.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground relative z-10">{cls.description}</p>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs relative z-10">
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
          <HiOutlineCalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{days || 'No schedule'}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
          <HiOutlineClock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{time || 'TBD'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tutor-purple-50 text-xs font-bold text-tutor-purple-700">
            {tutorInitials}
          </div>
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">Tutor</p>
            <p className="text-sm font-semibold">{tutorName}</p>
          </div>
        </div>
        {canEnter ? (
          <div
            className="flex h-8 items-center gap-1.5 rounded-lg bg-tutor-purple-600 px-3 text-xs font-semibold text-white group-hover:bg-tutor-purple-700 transition-colors"
          >
            <HiOutlineVideoCamera className="h-4 w-4" />
            Enter classroom
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No actions available</span>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tutor-purple-50 text-tutor-purple-600">
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
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-tutor-purple-50 text-tutor-purple-600">
        <HiOutlineAcademicCap className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

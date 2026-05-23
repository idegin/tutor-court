import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import {
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineUserCircle,
  HiOutlineVideoCamera,
} from 'react-icons/hi2'
import { Button } from '@/components/ui/button'

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

export default async function StudentOverviewPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const classesRes = await payload.find({
    collection: 'classes',
    where: { students: { equals: user!.id } },
    sort: 'startDate',
    limit: 10,
    depth: 1,
  })

  const upcoming = classesRes.docs.filter((c: any) => c.status !== 'completed' && c.status !== 'cancelled')

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-tutor-purple-600">
          Welcome back, {user!.firstName}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Your learning</h1>
        <p className="text-muted-foreground">Here's what's coming up.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Upcoming classes"
          value={upcoming.length.toString()}
          icon={<HiOutlineCalendarDays className="h-5 w-5" />}
        />
        <StatCard
          label="Open assignments"
          value="0"
          icon={<HiOutlineClipboardDocumentList className="h-5 w-5" />}
        />
        <StatCard
          label="Tutors"
          value={new Set(upcoming.map((c: any) => (typeof c.tutor === 'object' ? c.tutor?.id : c.tutor))).size.toString()}
          icon={<HiOutlineUserCircle className="h-5 w-5" />}
        />
      </div>

      <section className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Upcoming classes</h2>
          <p className="text-sm text-muted-foreground">Join when it's time for class.</p>
        </div>
        {upcoming.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            You're not enrolled in any classes yet. Your tutor will invite you when one is ready.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((cls: any) => {
              const tutorName =
                typeof cls.tutor === 'object'
                  ? `${cls.tutor.firstName} ${cls.tutor.lastName}`
                  : 'Tutor'
              const days = (cls.schedule || [])
                .map((s: any) => DAY_LABELS[s.day] || s.day)
                .join(', ')
              return (
                <li key={cls.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/10 transition-colors">
                  <div>
                    <p className="font-semibold text-foreground">{cls.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')} · with {tutorName} · {days || 'No days set'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex rounded-full bg-tutor-purple-50 text-tutor-purple-700 px-2.5 py-0.5 text-xs font-semibold uppercase">
                      {cls.status}
                    </span>
                    <Button asChild size="sm" className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer">
                      <Link href={`/classroom/${cls.id}`}>
                        <HiOutlineVideoCamera className="h-4 w-4" />
                        Enter Classroom
                      </Link>
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tutor-purple-50 text-tutor-purple-600">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </div>
    </div>
  )
}

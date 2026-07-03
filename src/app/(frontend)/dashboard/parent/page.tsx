import Link from 'next/link'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  HiOutlineUsers,
  HiOutlineCalendarDays,
  HiOutlineWallet,
  HiOutlineArrowRight,
} from 'react-icons/hi2'

import { formatCredits, formatNaira } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { getUpcomingClasses } from '@/lib/class-schedule'

export const metadata = {
  title: 'Overview | Parent Dashboard',
}

export default async function ParentOverviewPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const [studentsRes, walletRes, classesRes] = await Promise.all([
    payload.find({
      collection: 'students',
      where: { parent: { equals: user!.id } },
      limit: 0,
      depth: 0,
    }),
    payload.find({
      collection: 'wallets',
      where: { user: { equals: user!.id } },
      limit: 1,
      depth: 0,
    }),
    payload.find({
      collection: 'classes',
      where: { parents: { equals: user!.id } },
      sort: 'startDate',
      limit: 50,
      depth: 1,
    }),
  ])

  const wallet = walletRes.docs[0]
  const balance = (wallet?.balance as number) || 0
  const credits = (wallet?.creditBalance as number) || 0

  // Active classes (not completed/cancelled), ordered by next occurrence.
  const upcomingClasses = getUpcomingClasses(classesRes.docs as any[])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-tutor-purple-600">
          Hello, {user!.firstName}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Your overview</h1>
        <p className="text-muted-foreground">
          A snapshot of your wallet, students, and upcoming classes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Students"
          value={studentsRes.totalDocs.toString()}
          hint={studentsRes.totalDocs === 1 ? 'child added' : 'children added'}
          icon={<HiOutlineUsers className="h-5 w-5" />}
          href="/dashboard/parent/students"
        />
        <StatCard
          label="Wallet balance"
          value={formatNaira(balance)}
          hint={formatCredits(credits)}
          icon={<HiOutlineWallet className="h-5 w-5" />}
          href="/dashboard/parent/wallet"
        />
        <StatCard
          label="Upcoming classes"
          value={upcomingClasses.length.toString()}
          hint="scheduled this period"
          icon={<HiOutlineCalendarDays className="h-5 w-5" />}
        />
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Upcoming classes</h2>
            <p className="text-sm text-muted-foreground">
              Classes your children are invited to or enrolled in.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {upcomingClasses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No upcoming classes yet. A tutor will send you an invite to join one.
            </div>
          ) : (
            upcomingClasses.map((cls: any) => (
              <div
                key={cls.id}
                className="flex flex-col gap-2 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{cls.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')} · starts {new Date(cls.startDate).toLocaleDateString()}
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {cls.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  icon,
  href,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ReactNode
  href?: string
}) {
  const inner = (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 transition-colors hover:bg-muted/40">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tutor-purple-50 text-tutor-purple-600">
          {icon}
        </div>
        {href ? <HiOutlineArrowRight className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

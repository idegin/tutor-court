'use client'

import { Button } from '@/components/ui/button'
import { HiOutlineCheckCircle, HiOutlineClock, HiOutlineUsers, HiArrowRight } from 'react-icons/hi2'
import type { LiveSession } from './types'

/**
 * Post-class screen. For students it's a warm wrap-up; for tutors it echoes the
 * duration + credits spent (mock figures here).
 */
export function EndedScreen({
  session,
  isTutor,
  durationLabel,
  attendees,
  creditsSpent,
  onLeave,
}: {
  session: LiveSession
  isTutor: boolean
  durationLabel: string
  attendees: number
  creditsSpent: number
  onLeave: () => void
}) {
  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-neutral-950 px-4 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="lc-float absolute top-1/4 left-1/2 size-[440px] -translate-x-1/2 rounded-full bg-primary/15 blur-[130px]" />
      </div>

      <div className="lc-rise-in relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <div className="grid size-16 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30 [&_svg]:size-8">
          <HiOutlineCheckCircle />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">Class ended</h1>
        <p className="mt-2 text-sm text-white/60">{session.classTitle}</p>

        <div className="mt-7 grid w-full grid-cols-2 gap-3">
          <Stat icon={<HiOutlineClock />} label="Duration" value={durationLabel} />
          <Stat icon={<HiOutlineUsers />} label="Attendees" value={String(attendees)} />
        </div>

        {isTutor && (
          <div className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
            <span className="text-white/60">Credits used this class</span>
            <span className="font-semibold text-white">{creditsSpent}</span>
          </div>
        )}

        <Button onClick={onLeave} size="lg" className="mt-7 h-12 w-full rounded-2xl font-semibold">
          Back to dashboard <HiArrowRight className="ml-1" />
        </Button>
        {!isTutor && <p className="mt-3 text-xs text-white/40">Thanks for coming — see you next session!</p>}
      </div>
    </main>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
      <span className="grid size-8 place-items-center rounded-lg bg-white/8 text-white/70 [&_svg]:size-4">{icon}</span>
      <span className="mt-1 text-lg font-semibold">{value}</span>
      <span className="text-[11px] tracking-wide text-white/40 uppercase">{label}</span>
    </div>
  )
}

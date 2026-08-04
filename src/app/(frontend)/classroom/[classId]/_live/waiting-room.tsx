'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  HiMiniMicrophone,
  HiMiniVideoCamera,
  HiOutlineVideoCameraSlash,
  HiArrowRightOnRectangle,
  HiSparkles,
} from 'react-icons/hi2'
import { LuMicOff } from 'react-icons/lu'
import type { LiveSession, Participant } from './types'
import type { LocalMedia } from './use-local-media'
import { initials, resolveAvatar, seededHue } from './avatar'
import { MediaVideo } from './media-video'

const TIPS = [
  'Find a quiet spot and have a pen and paper ready.',
  'You can raise your hand any time to ask a question.',
  'Messages and reactions in chat are visible to everyone.',
  'Your tutor controls the whiteboard — you’ll see it live.',
]

/**
 * The waiting lounge (requirement 3): students land here until the tutor starts
 * the class, then auto-advance. Designed to feel calm and alive rather than a
 * dead spinner — breathing tutor orb, cycling tips, and a live roster of who's
 * already waiting. The tutor sees a "start" affordance instead.
 */
export function WaitingRoom({
  session,
  localUser,
  waiting,
  isTutor,
  media,
  onLeave,
  onTutorStart,
}: {
  session: LiveSession
  localUser: Participant
  waiting: Participant[]
  isTutor: boolean
  media: LocalMedia
  onLeave: () => void
  onTutorStart?: () => void
}) {
  const { micOn, camOn, stream } = media
  const selfHue = seededHue(localUser.name)
  const [tip, setTip] = React.useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 4200)
    return () => clearInterval(id)
  }, [])

  const hue = seededHue(session.tutorName)

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-neutral-950 px-4 py-10 text-white">
      <Aurora hue={hue} />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        {/* Breathing tutor orb */}
        <div className="relative grid place-items-center">
          <span className="absolute size-40 rounded-full" style={{ animation: 'lc-pulse-ring 3s ease-out infinite', background: 'color-mix(in oklch, var(--primary) 30%, transparent)' }} />
          <span className="absolute size-40 rounded-full" style={{ animation: 'lc-pulse-ring 3s ease-out infinite 1.5s', background: 'color-mix(in oklch, var(--primary) 22%, transparent)' }} />
          <div className="lc-float relative grid size-32 place-items-center rounded-full ring-1 ring-white/15 shadow-2xl shadow-black/40" style={{ background: `linear-gradient(135deg, hsl(${hue} 62% 44%), hsl(${(hue + 50) % 360} 60% 34%))` }}>
            <span className="text-3xl font-bold">{initials(session.tutorName)}</span>
          </div>
        </div>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
          </span>
          {isTutor ? 'You’re the host' : 'Waiting for your tutor'}
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {isTutor ? 'Ready when you are' : `${session.tutorName} will start soon`}
        </h1>
        <p className="mt-2 max-w-md text-sm text-white/60">{session.classTitle}</p>

        {/* cycling tip */}
        <div className="mt-6 flex min-h-11 items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-white/70">
          <HiSparkles className="size-4 shrink-0 text-primary" />
          <span key={tip} className="lc-rise-in text-left">{TIPS[tip]}</span>
        </div>

        {/* Waiting roster */}
        <div className="mt-8 w-full">
          <p className="mb-3 text-xs font-medium tracking-wide text-white/40 uppercase">
            {waiting.length} {waiting.length === 1 ? 'person' : 'people'} in the lounge
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {waiting.slice(0, 8).map((p, i) => (
              <div
                key={p.id}
                className="lc-rise-in flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] py-1 pr-3 pl-1"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Avatar className="size-6 ring-1 ring-white/10">
                  <AvatarImage src={resolveAvatar(p.name, p.avatar)} alt="" />
                  <AvatarFallback className="bg-neutral-800 text-[10px] text-white">{initials(p.name)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-white/80">{p.isLocal ? 'You' : p.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Self preview */}
        <div className="mt-8 relative aspect-video w-40 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-lg shadow-black/40">
          {camOn && stream ? (
            <MediaVideo stream={stream} />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <div
                className="grid size-12 place-items-center rounded-full text-sm font-semibold ring-1 ring-white/15"
                style={{ background: `linear-gradient(135deg, hsl(${selfHue} 60% 42%), hsl(${(selfHue + 50) % 360} 62% 34%))` }}
              >
                {initials(localUser.name)}
              </div>
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur">You</div>
        </div>

        {/* Controls */}
        <div className="mt-5 flex items-center gap-3">
          <LoungeToggle on={micOn} onClick={media.toggleMic} onIcon={<HiMiniMicrophone />} offIcon={<LuMicOff />} label="microphone" />
          <LoungeToggle on={camOn} onClick={media.toggleCam} onIcon={<HiMiniVideoCamera />} offIcon={<HiOutlineVideoCameraSlash />} label="camera" />
          <span className="mx-1 h-8 w-px bg-white/10" />
          {isTutor ? (
            <Button onClick={onTutorStart} size="lg" className="h-12 rounded-2xl px-6 font-semibold">
              Start class now
            </Button>
          ) : (
            <Button onClick={onLeave} variant="ghost" size="lg" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-5 text-white hover:bg-white/10">
              <HiArrowRightOnRectangle className="mr-1" /> Leave
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}

function LoungeToggle({
  on,
  onClick,
  onIcon,
  offIcon,
  label,
}: {
  on: boolean
  onClick: () => void
  onIcon: React.ReactNode
  offIcon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={`${on ? 'Turn off' : 'Turn on'} ${label}`}
      className={cn(
        'grid size-12 place-items-center rounded-2xl border transition-all duration-200 active:scale-95 [&_svg]:size-5',
        on ? 'border-white/12 bg-white/8 text-white hover:bg-white/16' : 'border-red-400/25 bg-red-500/15 text-red-300 hover:bg-red-500/25',
      )}
    >
      {on ? onIcon : offIcon}
    </button>
  )
}

function Aurora({ hue }: { hue: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="lc-float absolute -top-32 left-1/2 size-[540px] -translate-x-1/2 rounded-full blur-[130px]" style={{ background: `hsl(${hue} 70% 45% / 0.22)` }} />
      <div className="lc-drift absolute -bottom-24 -left-20 size-[420px] rounded-full bg-violet-600/15 blur-[120px]" />
      <div className="lc-drift absolute -right-24 bottom-10 size-[360px] rounded-full bg-cyan-500/12 blur-[120px]" style={{ animationDelay: '3s' }} />
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
    </div>
  )
}

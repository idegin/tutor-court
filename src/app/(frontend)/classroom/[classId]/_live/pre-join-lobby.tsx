'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  HiMiniMicrophone,
  HiMiniVideoCamera,
  HiOutlineVideoCameraSlash,
  HiOutlineSpeakerWave,
  HiArrowRight,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'
import { LuMicOff } from 'react-icons/lu'
import type { LiveSession, Participant } from './types'
import type { LocalMedia } from './use-local-media'
import { initials, seededHue } from './avatar'
import { MediaVideo } from './media-video'
import { DeviceSettings } from './device-settings'

/**
 * Google-Meet-style pre-join lobby with REAL device media: it requests camera +
 * mic permission on mount, shows a live self-preview, a real mic level meter,
 * and a working device picker. Mic/cam can be armed BEFORE joining.
 */
export function PreJoinLobby({
  session,
  localUser,
  isTutor,
  media,
  onJoin,
}: {
  session: LiveSession
  localUser: Participant
  isTutor: boolean
  media: LocalMedia
  onJoin: () => void
}) {
  const hue = seededHue(localUser.name)
  const { permission, error, stream, micOn, camOn, level, ensureAccess } = media

  // Prompt for devices as soon as the lobby appears.
  React.useEffect(() => {
    ensureAccess()
  }, [ensureAccess])

  const showVideo = permission === 'granted' && camOn && !!stream
  const starting = permission === 'prompting' || (permission === 'granted' && camOn && !stream)
  const blocked = permission === 'denied' || permission === 'unsupported'

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-neutral-950 px-4 py-8 text-white">
      <Backdrop />

      <div className="relative z-10 grid w-full max-w-5xl gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        {/* Camera preview */}
        <section aria-label="Camera preview" className="lc-rise-in">
          <div className="relative aspect-video w-full overflow-hidden rounded-[28px] border border-white/10 bg-neutral-900 shadow-2xl shadow-black/50">
            {showVideo ? (
              <MediaVideo stream={stream} />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                {starting ? (
                  <div className="flex flex-col items-center gap-3 text-white/60">
                    <span className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                    <p className="text-sm">Starting camera…</p>
                  </div>
                ) : (
                  <div
                    className="absolute inset-0 grid place-items-center"
                    style={{ background: `radial-gradient(120% 120% at 30% 20%, hsl(${hue} 40% 25% / 0.6), #0a0a0a 70%)` }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="grid size-24 place-items-center rounded-full text-2xl font-semibold ring-1 ring-white/15"
                        style={{ background: `linear-gradient(135deg, hsl(${hue} 60% 42%), hsl(${(hue + 50) % 360} 62% 34%))` }}
                      >
                        {initials(localUser.name)}
                      </div>
                      <p className="text-sm text-white/60">{blocked ? 'Camera unavailable' : 'Camera is off'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* live mic dot on preview */}
            {showVideo && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-sm font-medium backdrop-blur">
                <span className={cn('grid size-5 place-items-center rounded-full', micOn ? 'bg-primary/90 text-primary-foreground' : 'bg-red-500 text-white')}>
                  {micOn ? <HiMiniMicrophone className="size-3" /> : <LuMicOff className="size-3" />}
                </span>
                {localUser.name}
                {isTutor && <span className="text-primary">· Tutor</span>}
              </div>
            )}

            {/* mobile preview dock */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/60 to-transparent p-4 sm:hidden">
              <PreviewToggle on={micOn} onClick={media.toggleMic} onIcon={<HiMiniMicrophone />} offIcon={<LuMicOff />} label="mic" />
              <PreviewToggle on={camOn} onClick={media.toggleCam} onIcon={<HiMiniVideoCamera />} offIcon={<HiOutlineVideoCameraSlash />} label="camera" />
            </div>
          </div>

          {/* blocked banner */}
          {blocked && (
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              <HiOutlineExclamationTriangle className="mt-0.5 size-5 shrink-0 text-amber-300" />
              <div className="min-w-0">
                <p>{error ?? 'Camera and microphone are blocked.'}</p>
                {permission === 'denied' && (
                  <button type="button" onClick={() => media.ensureAccess()} className="mt-1 font-semibold text-amber-200 underline underline-offset-2 hover:text-white">
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* desktop toggles + real meter + settings */}
          <div className="mt-4 hidden items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex">
            <div className="flex items-center gap-3">
              <PreviewToggle on={micOn} onClick={media.toggleMic} onIcon={<HiMiniMicrophone />} offIcon={<LuMicOff />} label="mic" />
              <PreviewToggle on={camOn} onClick={media.toggleCam} onIcon={<HiMiniVideoCamera />} offIcon={<HiOutlineVideoCameraSlash />} label="camera" />
              <span className="ml-1 flex items-end gap-0.5" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-primary transition-all duration-75"
                    style={{ height: 6 + Math.max(0, level * 26 - i * 3), opacity: micOn ? 1 : 0.2 }}
                  />
                ))}
              </span>
            </div>
            <DeviceSettings media={media} />
          </div>
        </section>

        {/* Join card */}
        <section className="lc-rise-in flex flex-col items-start gap-5 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {session.classType === 'group' ? 'Group class' : '1-on-1 class'} · {session.subject}
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{session.classTitle}</h1>
            <p className="mt-2 text-sm text-white/60">
              {isTutor
                ? 'You’re about to start this class. Students in the waiting room will join automatically.'
                : `Hosted by ${session.tutorName}. Set up your mic and camera before you join.`}
            </p>
          </div>

          <ReadyRow icon={<HiOutlineSpeakerWave />} label="Speaker" value="System default" ok />
          <ReadyRow icon={micOn ? <HiMiniMicrophone /> : <LuMicOff />} label="Microphone" value={blocked ? 'Blocked' : micOn ? 'Ready' : 'Muted'} ok={micOn && !blocked} />
          <ReadyRow icon={camOn ? <HiMiniVideoCamera /> : <HiOutlineVideoCameraSlash />} label="Camera" value={blocked ? 'Blocked' : camOn ? 'Ready' : 'Off'} ok={camOn && !blocked} />

          <Button size="lg" onClick={onJoin} className="mt-1 h-12 w-full rounded-2xl text-base font-semibold">
            {isTutor ? 'Start class' : 'Join class'}
            <HiArrowRight className="ml-1" />
          </Button>

          {/* mobile settings link */}
          <div className="w-full sm:hidden">
            <DeviceSettings media={media} />
          </div>

          {!isTutor && (
            <p className="w-full text-center text-xs text-white/40">
              If your tutor hasn’t started yet, you’ll wait in the lounge.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

function PreviewToggle({
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
        'grid size-11 place-items-center rounded-full border transition-all duration-200 active:scale-95 [&_svg]:size-5',
        on
          ? 'border-white/15 bg-white/12 text-white hover:bg-white/20'
          : 'border-red-400/30 bg-red-500/90 text-white hover:bg-red-500',
      )}
    >
      {on ? onIcon : offIcon}
    </button>
  )
}

function ReadyRow({
  icon,
  label,
  value,
  ok,
}: {
  icon: React.ReactNode
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="flex w-full items-center gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <span className={cn('grid size-8 place-items-center rounded-lg [&_svg]:size-4', ok ? 'bg-primary/15 text-primary' : 'bg-white/5 text-white/50')}>
        {icon}
      </span>
      <span className="text-sm text-white/70">{label}</span>
      <span className={cn('ml-auto text-sm font-medium', ok ? 'text-white' : 'text-white/45')}>{value}</span>
    </div>
  )
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="lc-float absolute -top-24 -left-16 size-[420px] rounded-full bg-primary/20 blur-[110px]" />
      <div className="lc-drift absolute top-1/3 -right-24 size-[380px] rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]" />
    </div>
  )
}

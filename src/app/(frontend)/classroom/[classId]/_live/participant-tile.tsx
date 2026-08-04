'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  HiMiniMicrophone,
  HiOutlineHandRaised,
  HiMiniSignalSlash,
} from 'react-icons/hi2'
import { LuMicOff } from 'react-icons/lu'
import type { Participant } from './types'
import { initials, seededHue } from './avatar'
import { MediaVideo } from './media-video'

/**
 * One participant in the stage grid. The local user renders their REAL camera
 * (via `stream`); remote participants use a soft, per-person gradient stand-in
 * until the SFU is wired. "Camera off" always shows the avatar. Overlays: name,
 * mute state, speaking ring, host badge, hand raise.
 */
export function ParticipantTile({
  p,
  spotlight = false,
  stream = null,
  className,
}: {
  p: Participant
  spotlight?: boolean
  stream?: MediaStream | null
  className?: string
}) {
  const hue = seededHue(p.name)
  const isHost = p.role === 'host'
  const handRaised = Boolean(p.handRaisedAt)

  return (
    <div
      className={cn(
        'group relative isolate overflow-hidden rounded-3xl border border-white/10 bg-neutral-900',
        'transition-all duration-300',
        p.speaking && p.micOn && 'lc-speaking rounded-3xl',
        className,
      )}
      style={{ containerType: 'inline-size' } as React.CSSProperties}
    >
      {/* Camera surface — real media when a stream is present (local mirrored,
          remote not), else the gradient stand-in used in demo mode. */}
      {p.camOn && stream ? (
        <div className="absolute inset-0">
          <MediaVideo stream={stream} mirror={Boolean(p.isLocal)} muted={Boolean(p.isLocal)} />
        </div>
      ) : p.camOn ? (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(120% 120% at 30% 20%, hsl(${hue} 70% 45% / 0.55), transparent 60%), radial-gradient(120% 120% at 80% 90%, hsl(${(hue + 40) % 360} 75% 40% / 0.5), #0a0a0a 70%)`,
          }}
        >
          {/* subtle grain */}
          <div className="absolute inset-0 opacity-[0.12] mix-blend-overlay [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px]" />
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-neutral-800/60 to-neutral-950">
          <div
            className="grid size-[clamp(44px,26cqw,88px)] place-items-center rounded-full text-lg font-semibold text-white/95 ring-1 ring-white/15"
            style={{ background: `linear-gradient(135deg, hsl(${hue} 60% 42%), hsl(${(hue + 50) % 360} 62% 34%))` }}
          >
            {initials(p.name)}
          </div>
        </div>
      )}

      {/* Top-left: role / you badges */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
        {isHost && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary-foreground uppercase">
            Tutor
          </span>
        )}
        {p.isLocal && (
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            You
          </span>
        )}
      </div>

      {/* Top-right: connection / hand */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
        {handRaised && (
          <span className="grid size-7 place-items-center rounded-full bg-amber-400 text-neutral-900 shadow-lg shadow-amber-400/30">
            <HiOutlineHandRaised className="size-4" />
          </span>
        )}
        {p.connection === 'weak' && (
          <span className="grid size-7 place-items-center rounded-full bg-red-500/80 text-white">
            <HiMiniSignalSlash className="size-4" />
          </span>
        )}
      </div>

      {/* Bottom bar: name + mic */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-1.5 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-2.5 pt-8 pb-2 sm:gap-2 sm:px-3 sm:pb-2.5">
        <span
          className={cn(
            'grid size-5 shrink-0 place-items-center rounded-full sm:size-6',
            p.micOn ? 'bg-white/15 text-white' : 'bg-red-500/90 text-white',
          )}
        >
          {p.micOn ? (
            <HiMiniMicrophone className={cn('size-3 sm:size-3.5', p.speaking && 'animate-pulse')} />
          ) : (
            <LuMicOff className="size-3 sm:size-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-white drop-shadow sm:text-sm">
          {p.isLocal ? `${p.name.split(' ')[0]} (You)` : p.name}
        </span>
      </div>

      {spotlight && (
        <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-primary/40" />
      )}
    </div>
  )
}

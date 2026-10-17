'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { HiOutlineUsers } from 'react-icons/hi2'
import type { Participant } from './types'
import { ParticipantTile } from './participant-tile'
import { VScroll, HScroll } from './ui'

/**
 * The stage. Three layouts:
 *  - spotlight: when any participant is sharing their screen, the sharer fills
 *    the main area and everyone else moves to a compact sidebar strip.
 *  - filmstrip: when a whiteboard/presentation owns the main area, participants
 *    shrink into a scrollable strip (horizontal on mobile, vertical on desktop).
 *  - grid: everyone in a responsive tile grid (caps visible tiles for big group
 *    classes and shows a "+N" overflow tile).
 */
export function Stage({
  participants,
  localCameraStream = null,
  localScreenStream = null,
  remoteCameraStreams,
  remoteScreenStreams,
  filmstrip = false,
  children,
}: {
  participants: Participant[]
  localCameraStream?: MediaStream | null
  localScreenStream?: MediaStream | null
  remoteCameraStreams?: Map<string, MediaStream>
  remoteScreenStreams?: Map<string, MediaStream>
  filmstrip?: boolean
  children?: React.ReactNode
}) {
  const cameraFor = (p: Participant): MediaStream | null =>
    p.isLocal ? localCameraStream : (remoteCameraStreams?.get(p.id) ?? null)
  const screenFor = (p: Participant): MediaStream | null =>
    p.isLocal ? localScreenStream : (remoteScreenStreams?.get(p.id) ?? null)

  // Host + active speakers first, then hands, then the rest.
  const ordered = React.useMemo(() => {
    return [...participants].sort((a, b) => {
      const score = (p: Participant) => (p.role === 'host' ? 3 : p.speaking ? 2 : p.handRaisedAt ? 1 : 0)
      return score(b) - score(a)
    })
  }, [participants])

  // ── Spotlight: someone is sharing their screen ─────────────────────────────
  const sharer = ordered.find((p) => p.screenOn)
  if (sharer) {
    // Keep the presenter's camera first in the rail while their independent
    // screen stream fills the stage.
    const rail = [sharer, ...ordered.filter((p) => p.id !== sharer.id)].slice(0, 12)
    return (
      <div className="flex h-full min-h-0 flex-col gap-2 lg:flex-row lg:gap-3">
        {/* Main: the screen share, large */}
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl border border-emerald-500/20 ring-1 ring-emerald-500/30">
          <ParticipantTile
            p={sharer}
            stream={screenFor(sharer)}
            mediaKind="screen"
            className="h-full w-full rounded-3xl"
          />
        </div>

        {/* Mobile: horizontal strip */}
        <HScroll className="shrink-0 lg:hidden">
          <div className="flex gap-2 pb-1">
            {rail.map((p) => (
              <ParticipantTile key={p.id} p={p} stream={cameraFor(p)} className="aspect-video w-28 shrink-0" />
            ))}
          </div>
        </HScroll>

        {/* Desktop: vertical sidebar */}
        <VScroll className="hidden shrink-0 lg:flex lg:h-full lg:w-44 lg:flex-col lg:gap-2">
          <div className="flex flex-col gap-2 pr-1">
            {rail.map((p) => (
              <ParticipantTile key={p.id} p={p} stream={cameraFor(p)} className="aspect-video w-full" />
            ))}
          </div>
        </VScroll>
      </div>
    )
  }

  // ── Filmstrip: whiteboard/presentation owns the main area ─────────────────
  if (filmstrip) {
    const strip = ordered.slice(0, 12)
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
        <div className="min-h-0 flex-1 overflow-hidden rounded-3xl">{children}</div>

        {/* mobile: horizontal strip */}
        <HScroll className="shrink-0 lg:hidden">
          <div className="flex gap-2 pb-1">
            {strip.map((p) => (
              <ParticipantTile key={p.id} p={p} stream={cameraFor(p)} className="aspect-video w-32 shrink-0" />
            ))}
          </div>
        </HScroll>

        {/* desktop: vertical rail */}
        <VScroll className="hidden shrink-0 lg:block lg:h-full lg:w-40">
          <div className="flex flex-col gap-2 pr-2">
            {strip.map((p) => (
              <ParticipantTile key={p.id} p={p} stream={cameraFor(p)} className="aspect-video w-full" />
            ))}
          </div>
        </VScroll>
      </div>
    )
  }

  // ── Grid: normal call, no screen share ────────────────────────────────────
  const MAX = 11
  const visible = ordered.slice(0, MAX)
  const overflow = ordered.length - visible.length
  const n = visible.length + (overflow > 0 ? 1 : 0)

  // A one or two person call should use the available stage instead of sitting
  // in the same compact grid used by a full class. Width is capped to keep the
  // controls and names easy to scan on very wide monitors; centering uses the
  // available height naturally. On narrow phones two tiles stack and scroll if
  // the browser chrome leaves too little vertical room.
  if (n <= 2) {
    return (
      <VScroll className="h-full">
        <div
          className={cn(
            'mx-auto grid min-h-full w-full content-center gap-2 py-0.5 sm:gap-3',
            n === 1
              ? 'max-w-5xl grid-cols-1'
              : 'max-w-[100rem] grid-cols-1 sm:grid-cols-2',
          )}
        >
          {visible.map((p) => (
            <ParticipantTile
              key={p.id}
              p={p}
              spotlight={p.role === 'host'}
              stream={cameraFor(p)}
              className="aspect-video w-full"
            />
          ))}
        </div>
      </VScroll>
    )
  }

  return (
    <VScroll className="h-full">
      <div className={cn('mx-auto grid max-w-6xl gap-2 py-0.5 sm:gap-3', gridCols(n))}>
        {visible.map((p) => (
          <ParticipantTile
            key={p.id}
            p={p}
            spotlight={p.role === 'host'}
            stream={cameraFor(p)}
            className="aspect-video"
          />
        ))}
        {overflow > 0 && (
          <div className="grid aspect-video place-items-center rounded-3xl border border-white/10 bg-white/[0.03] text-center">
            <div className="flex flex-col items-center gap-1 text-white/70">
              <HiOutlineUsers className="size-6" />
              <span className="text-lg font-semibold">+{overflow}</span>
              <span className="text-xs text-white/40">more watching</span>
            </div>
          </div>
        )}
      </div>
    </VScroll>
  )
}

/** Pick a pleasing grid column count for n tiles, mobile-first. */
function gridCols(n: number): string {
  if (n <= 4) return 'grid-cols-2'
  if (n <= 9) return 'grid-cols-2 sm:grid-cols-3'
  return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
}

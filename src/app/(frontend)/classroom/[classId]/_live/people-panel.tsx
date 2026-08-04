'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  HiMiniMicrophone,
  HiOutlineHandRaised,
  HiOutlineUserPlus,
  HiOutlineNoSymbol,
  HiEllipsisHorizontal,
} from 'react-icons/hi2'
import { LuMicOff } from 'react-icons/lu'
import type { Participant } from './types'
import { initials, resolveAvatar } from './avatar'
import { VScroll } from './ui'

/**
 * People panel: roster with raised hands surfaced to the top. The tutor gets
 * per-person controls (promote to stage, mute, remove — requirement: tutor has
 * full control + can remove participants). Students see a read-only list.
 */
export function PeoplePanel({
  everyone,
  isTutor,
  onPromote,
  onMute,
  onRemove,
}: {
  everyone: Participant[]
  isTutor: boolean
  onPromote: (id: string) => void
  onMute: (id: string) => void
  onRemove: (id: string) => void
}) {
  const hands = everyone.filter((p) => p.handRaisedAt).sort((a, b) => (a.handRaisedAt! - b.handRaisedAt!))
  const rest = everyone.filter((p) => !p.handRaisedAt)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <VScroll className="min-h-0 flex-1">
        <div className="px-3 py-3">
        {hands.length > 0 && (
          <section className="mb-4">
            <SectionLabel>
              <HiOutlineHandRaised className="size-3.5 text-amber-300" /> Raised hands · {hands.length}
            </SectionLabel>
            <div className="mt-2 space-y-1">
              {hands.map((p) => (
                <Row key={p.id} p={p} isTutor={isTutor} raised onPromote={onPromote} onMute={onMute} onRemove={onRemove} />
              ))}
            </div>
          </section>
        )}

        <SectionLabel>In the class · {rest.length}</SectionLabel>
        <div className="mt-2 space-y-1">
          {rest.map((p) => (
            <Row key={p.id} p={p} isTutor={isTutor} onPromote={onPromote} onMute={onMute} onRemove={onRemove} />
          ))}
        </div>
        </div>
      </VScroll>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 px-1 text-[11px] font-medium tracking-wide text-white/40 uppercase">
      {children}
    </p>
  )
}

function Row({
  p,
  isTutor,
  raised,
  onPromote,
  onMute,
  onRemove,
}: {
  p: Participant
  isTutor: boolean
  raised?: boolean
  onPromote: (id: string) => void
  onMute: (id: string) => void
  onRemove: (id: string) => void
}) {
  const [menu, setMenu] = React.useState(false)
  const isHost = p.role === 'host'
  const canManage = isTutor && !isHost && !p.isLocal

  return (
    <div className={cn('flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.04]', raised && 'bg-amber-400/[0.06]')}>
      <div className="relative">
        <Avatar className="size-9 ring-1 ring-white/10">
          <AvatarImage src={resolveAvatar(p.name, p.avatar)} alt="" />
          <AvatarFallback className="bg-neutral-800 text-xs text-white">{initials(p.name)}</AvatarFallback>
        </Avatar>
        {raised && (
          <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-amber-400 text-neutral-900 ring-2 ring-neutral-950">
            <HiOutlineHandRaised className="size-3" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
          {p.isLocal ? 'You' : p.name}
          {isHost && <span className="rounded bg-primary/20 px-1 text-[9px] font-bold tracking-wide text-primary uppercase">Tutor</span>}
        </p>
        <p className="truncate text-[11px] text-white/40">{isHost ? 'Host' : p.role === 'publisher' ? 'On stage' : 'Viewer'}</p>
      </div>

      {/* mic state */}
      <span className={cn('grid size-6 shrink-0 place-items-center rounded-full [&_svg]:size-3.5', p.micOn ? 'text-white/50' : 'text-red-400')}>
        {p.micOn ? <HiMiniMicrophone /> : <LuMicOff />}
      </span>

      {canManage && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label={`Manage ${p.name}`}
            className="grid size-7 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white [&_svg]:size-4.5"
          >
            <HiEllipsisHorizontal />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 p-1 shadow-2xl shadow-black/50">
                <MenuItem icon={<HiOutlineUserPlus />} onClick={() => { onPromote(p.id); setMenu(false) }}>
                  {raised ? 'Bring on stage' : 'Invite to stage'}
                </MenuItem>
                <MenuItem icon={<LuMicOff />} onClick={() => { onMute(p.id); setMenu(false) }} disabled={!p.micOn}>
                  Mute for everyone
                </MenuItem>
                <MenuItem icon={<HiOutlineNoSymbol />} danger onClick={() => { onRemove(p.id); setMenu(false) }}>
                  Remove from class
                </MenuItem>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-40 [&_svg]:size-4',
        danger ? 'text-red-300 hover:bg-red-500/10' : 'text-white/80 hover:bg-white/8',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

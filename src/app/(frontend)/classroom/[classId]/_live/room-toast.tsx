'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials, resolveAvatar } from './avatar'
import type { ChatMessage } from './types'

// In-call notifications. The global sonner Toaster follows the site theme, which
// renders low-contrast/muted text over the dark classroom (the "can hardly read
// it" bug). These helpers render our own solid, high-contrast dark cards so
// every in-call toast is legible regardless of theme.

type Tone = 'default' | 'success' | 'warning' | 'error' | 'info'

const TONE: Record<Tone, string> = {
  default: 'bg-white/12 text-white',
  success: 'bg-primary/20 text-primary',
  warning: 'bg-amber-400/20 text-amber-200',
  error: 'bg-red-500/20 text-red-200',
  info: 'bg-cyan-400/20 text-cyan-200',
}

function Card({
  icon,
  title,
  description,
  tone = 'default',
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  tone?: Tone
}) {
  return (
    <div className="pointer-events-auto flex w-[340px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border border-white/15 bg-neutral-900 p-3.5 shadow-2xl shadow-black/60 ring-1 ring-black/40">
      {icon != null && (
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl [&_svg]:size-5', TONE[tone])}>{icon}</span>
      )}
      <div className="min-w-0 pt-0.5">
        <p className="text-sm leading-snug font-semibold text-white">{title}</p>
        {description != null && <p className="mt-0.5 text-[13px] leading-snug text-white/75">{description}</p>}
      </div>
    </div>
  )
}

export function roomToast(opts: {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  tone?: Tone
  duration?: number
}) {
  toast.custom(
    () => <Card icon={opts.icon} title={opts.title} description={opts.description} tone={opts.tone} />,
    { duration: opts.duration },
  )
}

/** Incoming chat message toast with the sender's avatar. */
export function messageToast(m: ChatMessage) {
  toast.custom(() => (
    <div className="pointer-events-auto flex w-[340px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border border-white/15 bg-neutral-900 p-3 shadow-2xl shadow-black/60 ring-1 ring-black/40">
      <Avatar className="size-9 shrink-0 ring-1 ring-white/15">
        <AvatarImage src={resolveAvatar(m.senderName, m.senderAvatar)} alt="" />
        <AvatarFallback className="bg-neutral-800 text-xs text-white">{initials(m.senderName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white">{m.senderName}</p>
        <p className="truncate text-sm text-white/80">{m.body}</p>
      </div>
    </div>
  ))
}

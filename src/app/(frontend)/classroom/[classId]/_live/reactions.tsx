'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { ReactionEmoji } from './types'

export const REACTIONS: ReactionEmoji[] = ['👍', '❤️', '😂', '🎉', '👏', '🔥', '😮', '🙌']

export interface FloatingReaction {
  id: string
  emoji: ReactionEmoji
  /** 0..1 horizontal anchor so bursts don't all stack in one column. */
  x: number
  drift: number
}

/** Full-screen, pointer-transparent layer that renders rising emoji bursts. */
export function ReactionsLayer({ items }: { items: FloatingReaction[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      {items.map((r) => (
        <span
          key={r.id}
          className="absolute bottom-24 text-3xl sm:text-4xl"
          style={{
            left: `${r.x * 100}%`,
            // @ts-expect-error custom prop consumed by the keyframe
            '--lc-drift': `${r.drift}px`,
            animation: 'lc-reaction-rise 2.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
          }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  )
}

/** Horizontal emoji picker shown above the reaction control. */
export function ReactionPicker({
  open,
  onPick,
}: {
  open: boolean
  onPick: (e: ReactionEmoji) => void
}) {
  return (
    <div
      className={cn(
        'absolute bottom-full left-1/2 mb-3 -translate-x-1/2 origin-bottom transition-all duration-200',
        open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0',
      )}
    >
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl">
        {REACTIONS.map((e, i) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            aria-label={`React ${e}`}
            className="grid size-9 place-items-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-white/10 active:scale-110"
            style={{ transitionDelay: open ? `${i * 20}ms` : '0ms' }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { HiBolt } from 'react-icons/hi2'
import type { CreditState } from './types'

/**
 * Tutor-ONLY live credit meter (requirements 10 & 11). Draws down as the class
 * runs; turns amber/red and pulses when the projected time-remaining crosses the
 * low threshold. Students never render this component.
 */
export function CreditMeter({ credit, compact = false }: { credit: CreditState; compact?: boolean }) {
  const total = credit.balance + credit.consumed
  const pct = total > 0 ? Math.max(0, Math.min(100, (credit.balance / total) * 100)) : 0
  const minutesLeft = credit.burnPerMinute > 0 ? Math.floor(credit.balance / credit.burnPerMinute) : Infinity
  const low = credit.balance <= credit.lowThreshold
  const critical = credit.balance <= Math.floor(credit.lowThreshold / 2)

  const tone = critical ? 'red' : low ? 'amber' : 'brand'
  const bar = { brand: 'bg-primary', amber: 'bg-amber-400', red: 'bg-red-500' }[tone]
  const text = { brand: 'text-primary', amber: 'text-amber-300', red: 'text-red-300' }[tone]

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur',
          low ? 'border-amber-400/30 bg-amber-400/10' : 'border-white/10 bg-white/8',
          critical && 'border-red-500/40 bg-red-500/15 animate-pulse',
          text,
        )}
        title={`${credit.balance} credits · ~${minutesLeft} min left`}
      >
        <HiBolt className="size-3.5" />
        {credit.balance}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-white/50 uppercase">
          <HiBolt className={cn('size-4', text)} /> Live credits
        </span>
        <span className={cn('text-xs font-medium', text)}>
          {minutesLeft === Infinity ? '—' : `~${minutesLeft} min left`}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={cn('text-2xl font-bold tabular-nums', critical && 'text-red-300')}>{credit.balance}</span>
        <span className="text-xs text-white/40">/ {total} credits</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
        <div className={cn('h-full rounded-full transition-all duration-700', bar)} style={{ width: `${pct}%` }} />
      </div>
      {low && (
        <p className={cn('mt-2 text-xs font-medium', text)}>
          {critical ? 'Credits almost gone — top up to avoid the class ending.' : 'Running low. Consider topping up soon.'}
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-white/35">Only you can see this.</p>
    </div>
  )
}

'use client'

import * as React from 'react'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Dark-styled scroll areas for the classroom, built on the same Radix primitive
// the shadcn ScrollArea wraps (so we get its custom scrollbar instead of the
// native one) with a light thumb that reads on the dark room surfaces.

export function VScroll({
  className,
  children,
  viewportRef,
}: {
  className?: string
  children: React.ReactNode
  viewportRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn('relative', className)}>
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] outline-none"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.ScrollAreaScrollbar
        orientation="vertical"
        className="flex h-full w-2 touch-none p-px transition-colors select-none"
      >
        <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-white/20" />
      </ScrollAreaPrimitive.ScrollAreaScrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

export function HScroll({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn('relative', className)}>
      <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className="size-full rounded-[inherit] outline-none">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.ScrollAreaScrollbar
        orientation="horizontal"
        className="flex h-2 touch-none flex-col p-px transition-colors select-none"
      >
        <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-white/20" />
      </ScrollAreaPrimitive.ScrollAreaScrollbar>
    </ScrollAreaPrimitive.Root>
  )
}

/**
 * Circular control-bar button used across the live room (mic, cam, leave, etc).
 * States: default (glass), active (brand), danger (red), on/off toggles.
 * Always ≥44px hit area for touch (requirement: mobile-first).
 */
export const CtrlButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string
    icon: React.ReactNode
    tone?: 'default' | 'active' | 'danger' | 'muted'
    badge?: React.ReactNode
    /** Optional caption under the button (desktop control bar). */
    caption?: string
  }
>(function CtrlButton(
  { label, icon, tone = 'default', badge, caption, className, ...props },
  ref,
) {
  const tones: Record<string, string> = {
    default:
      'bg-white/8 text-white hover:bg-white/16 border-white/12 active:scale-95',
    active:
      'bg-primary text-primary-foreground hover:bg-primary/90 border-primary/40 shadow-[0_6px_20px_-6px] shadow-primary/60',
    danger:
      'bg-red-500 text-white hover:bg-red-500/90 border-red-400/40 shadow-[0_6px_20px_-6px] shadow-red-500/60',
    muted:
      'bg-red-500/15 text-red-300 hover:bg-red-500/25 border-red-400/25',
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          className={cn(
            'group relative inline-flex size-12 items-center justify-center rounded-2xl border backdrop-blur-md',
            'transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50 sm:size-[52px]',
            '[&_svg]:size-5 sm:[&_svg]:size-[22px]',
            tones[tone],
            className,
          )}
          {...props}
        >
          {icon}
          {badge != null && (
            <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-neutral-950">
              {badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="border-white/10 bg-neutral-900 text-white">
        {caption ?? label}
      </TooltipContent>
    </Tooltip>
  )
})

/** A soft glass surface used by panels + cards inside the dark room. */
export function Glass({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl',
        className,
      )}
      {...props}
    />
  )
}

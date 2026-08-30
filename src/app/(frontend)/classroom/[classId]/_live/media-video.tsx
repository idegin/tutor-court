'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Binds a MediaStream to a <video>. Local previews are muted (no echo) and
 * mirrored to feel like a mirror, matching every major meeting app.
 */
export function MediaVideo({
  stream,
  mirror = true,
  muted = true,
  className,
}: {
  stream: MediaStream | null
  mirror?: boolean
  muted?: boolean
  className?: string
}) {
  const ref = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.srcObject !== stream) el.srcObject = stream
    // Unmuted remote video is blocked from autoplaying on iOS Safari without an
    // explicit play() (the "remote tile stays black" bug on mobile). The user
    // already gestured by joining, so this resolves; ignore the benign reject.
    if (stream) el.play().catch(() => {})
  }, [stream])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={cn('size-full object-cover', mirror && '-scale-x-100', className)}
    />
  )
}

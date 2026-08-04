'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2'

// Minimal standalone whiteboard surface. This is a lightweight interim
// replacement for the old VideoSDK-era slide canvas: a local freehand SVG board
// so the /whiteboard/[id] route keeps working while the collaborative
// whiteboard is rebuilt on the new realtime backend (Ably) in a later phase.

const PEN_COLORS = ['#111827', '#16a34a', '#db2777', '#d97706', '#2563eb']

interface Stroke {
  d: string
  color: string
}

export function StandaloneCanvas({ canEdit }: { canEdit: boolean }) {
  const [color, setColor] = React.useState(PEN_COLORS[0])
  const [strokes, setStrokes] = React.useState<Stroke[]>([])
  const drawing = React.useRef(false)

  const pt = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 1000, y: ((e.clientY - r.top) / r.height) * 620 }
  }
  const start = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!canEdit) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const { x, y } = pt(e)
    setStrokes((s) => [...s, { d: `M ${x} ${y}`, color }])
  }
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return
    const { x, y } = pt(e)
    setStrokes((s) => {
      const arr = [...s]
      arr[arr.length - 1] = { ...arr[arr.length - 1], d: `${arr[arr.length - 1].d} L ${x} ${y}` }
      return arr
    })
  }
  const end = () => { drawing.current = false }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <svg
          viewBox="0 0 1000 620"
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className={cn('absolute inset-0 size-full touch-none', canEdit ? 'cursor-crosshair' : 'cursor-default')}
        >
          <defs>
            <pattern id="sw-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f172a" strokeOpacity="0.06" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1000" height="620" fill="url(#sw-grid)" />
          {strokes.map((s, i) => (
            <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
        {!canEdit && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900/80 px-3 py-1 text-xs text-white/90">
            View only
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4"><HiOutlinePencil /></span>
          <div className="flex items-center gap-1.5">
            {PEN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Pen ${c}`}
                className={cn('size-6 rounded-full ring-2 ring-offset-2 ring-offset-card transition-transform hover:scale-110', color === c ? 'ring-foreground' : 'ring-transparent')}
                style={{ background: c }}
              />
            ))}
          </div>
          <button type="button" onClick={() => setStrokes([])} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4">
            <HiOutlineTrash /> Clear
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
} from 'react-icons/hi2'
import type { Whiteboard } from './types'
import { HScroll } from './ui'

const PEN_COLORS = ['#34d399', '#f472b6', '#fbbf24', '#60a5fa', '#ffffff']

interface Stroke {
  d: string
  color: string
}

/** A whiteboard op broadcast over Ably: a completed stroke or a board clear. */
export interface WBOp {
  id: string
  boardId: string
  type: 'stroke' | 'clear'
  stroke?: Stroke
}

/**
 * Multi-whiteboard surface (requirements: multiple whiteboards + real-time,
 * student-writable toggle). UI-first: strokes are drawn locally with SVG; the
 * realtime backend will broadcast stroke ops + persist a snapshot per board.
 */
export function BoardsPanel({
  boards,
  activeId,
  isTutor,
  writable,
  onSelect,
  onCreate,
  onToggleWritable,
  onClose,
  onDraw,
  remoteOps,
}: {
  boards: Whiteboard[]
  activeId: string | null
  isTutor: boolean
  writable: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onToggleWritable: () => void
  onClose: () => void
  /** Emitted when the local user completes a stroke or clears (for realtime sync). */
  onDraw?: (op: WBOp) => void
  /** Ops from other participants to apply. Each is applied at most once (by id). */
  remoteOps?: WBOp[]
}) {
  const canDraw = isTutor || writable
  const [color, setColor] = React.useState(PEN_COLORS[0])
  // strokes per board id
  const [strokes, setStrokes] = React.useState<Record<string, Stroke[]>>({})
  const drawing = React.useRef<string | null>(null)
  const active = boards.find((b) => b.id === activeId) ?? boards[0]
  const list = active ? strokes[active.id] ?? [] : []

  // Apply remote ops exactly once (deduped by op id).
  const appliedRef = React.useRef<Set<string>>(new Set())
  React.useEffect(() => {
    if (!remoteOps) return
    for (const op of remoteOps) {
      if (appliedRef.current.has(op.id)) continue
      appliedRef.current.add(op.id)
      if (op.type === 'clear') setStrokes((s) => ({ ...s, [op.boardId]: [] }))
      else if (op.stroke) setStrokes((s) => ({ ...s, [op.boardId]: [...(s[op.boardId] ?? []), op.stroke!] }))
    }
  }, [remoteOps])

  const pt = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 1000, y: ((e.clientY - r.top) / r.height) * 600 }
  }

  const start = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!canDraw || !active) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = pt(e)
    drawing.current = `M ${x} ${y}`
    setStrokes((s) => ({ ...s, [active.id]: [...(s[active.id] ?? []), { d: drawing.current!, color }] }))
  }
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing.current || !active) return
    const { x, y } = pt(e)
    drawing.current += ` L ${x} ${y}`
    setStrokes((s) => {
      const arr = [...(s[active.id] ?? [])]
      arr[arr.length - 1] = { ...arr[arr.length - 1], d: drawing.current! }
      return { ...s, [active.id]: arr }
    })
  }
  const end = () => {
    if (drawing.current && active) {
      const arr = strokes[active.id] ?? []
      const last = arr[arr.length - 1]
      if (last) onDraw?.({ id: crypto.randomUUID(), boardId: active.id, type: 'stroke', stroke: last })
    }
    drawing.current = null
  }
  const clear = () => {
    if (!active) return
    setStrokes((s) => ({ ...s, [active.id]: [] }))
    onDraw?.({ id: crypto.randomUUID(), boardId: active.id, type: 'clear' })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Board tabs */}
      <HScroll className="border-b border-white/8">
        <div className="flex items-center gap-1.5 px-3 py-2">
          {boards.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelect(b.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                b.id === active?.id ? 'bg-white/12 text-white' : 'text-white/50 hover:bg-white/6 hover:text-white/80',
              )}
            >
              <span className="size-2 rounded-full" style={{ background: `hsl(${b.hue} 65% 55%)` }} />
              {b.title}
            </button>
          ))}
          {isTutor && (
            <button
              type="button"
              onClick={onCreate}
              aria-label="New whiteboard"
              className="grid size-7 shrink-0 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/8 hover:text-white [&_svg]:size-4"
            >
              <HiOutlinePlus />
            </button>
          )}
        </div>
      </HScroll>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1 bg-neutral-100">
        <svg
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className={cn('absolute inset-0 size-full touch-none', canDraw ? 'cursor-crosshair' : 'cursor-default')}
        >
          <defs>
            <pattern id="wb-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f172a" strokeOpacity="0.06" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1000" height="600" fill="url(#wb-grid)" />
          {list.map((s, i) => (
            <path key={i} d={s.d} fill="none" stroke={s.color === '#ffffff' ? '#111827' : s.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>

        {!canDraw && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900/80 px-3 py-1 text-xs text-white/80 backdrop-blur">
            View only · your tutor is presenting
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-t border-white/8 bg-neutral-950 px-3 py-2.5">
        {canDraw ? (
          <>
            <span className="grid size-8 place-items-center rounded-lg bg-white/8 text-white/70 [&_svg]:size-4"><HiOutlinePencil /></span>
            <div className="flex items-center gap-1.5">
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Pen ${c}`}
                  className={cn('size-6 rounded-full ring-2 ring-offset-2 ring-offset-neutral-950 transition-transform hover:scale-110', color === c ? 'ring-white' : 'ring-transparent')}
                  style={{ background: c }}
                />
              ))}
            </div>
            <button type="button" onClick={clear} className="ml-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/8 hover:text-white [&_svg]:size-4">
              <HiOutlineTrash /> Clear
            </button>
          </>
        ) : (
          <span className="text-xs text-white/40">Only the tutor can draw right now.</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isTutor && (
            <button
              type="button"
              onClick={onToggleWritable}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors [&_svg]:size-4',
                writable ? 'border-primary/40 bg-primary/15 text-primary' : 'border-white/10 bg-white/5 text-white/60 hover:text-white',
              )}
            >
              {writable ? <HiOutlineLockOpen /> : <HiOutlineLockClosed />}
              {writable ? 'Students can draw' : 'Locked to you'}
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg px-2.5 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/8 hover:text-white lg:hidden">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

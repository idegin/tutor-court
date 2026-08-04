'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HiPaperAirplane, HiOutlineFaceSmile } from 'react-icons/hi2'
import type { ChatMessage, Participant, ReactionEmoji } from './types'
import { initials, resolveAvatar } from './avatar'
import { REACTIONS } from './reactions'
import { VScroll } from './ui'

/**
 * Live chat (requirement: real-time chat + reactions). Presentation-only here:
 * messages arrive via props, sending/ reacting bubble up to the orchestrator
 * which fakes the realtime round-trip.
 */
export function ChatPanel({
  messages,
  localUser,
  onSend,
  onReact,
}: {
  messages: ChatMessage[]
  localUser: Participant
  onSend: (body: string) => void
  onReact: (messageId: string, emoji: ReactionEmoji) => void
}) {
  const [draft, setDraft] = React.useState('')
  const viewportRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = viewportRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    onSend(body)
    setDraft('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <VScroll className="min-h-0 flex-1" viewportRef={viewportRef}>
        <div className="space-y-4 px-4 py-4">
          {messages.map((m) => (
            <MessageRow
              key={m.id}
              m={m}
              mine={m.senderId === localUser.id}
              onReact={(e) => onReact(m.id, e)}
            />
          ))}
        </div>
      </VScroll>

      <form onSubmit={submit} className="border-t border-white/8 p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
          <button type="button" aria-label="Emoji" className="grid size-9 shrink-0 place-items-center rounded-xl text-white/50 transition-colors hover:bg-white/8 hover:text-white [&_svg]:size-5">
            <HiOutlineFaceSmile />
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit(e)
            }}
            rows={1}
            placeholder="Send a message…"
            className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm text-white placeholder:text-white/35 outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 [&_svg]:size-4"
          >
            <HiPaperAirplane className="-rotate-45" />
          </button>
        </div>
      </form>
    </div>
  )
}

function MessageRow({
  m,
  mine,
  onReact,
}: {
  m: ChatMessage
  mine: boolean
  onReact: (e: ReactionEmoji) => void
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false)

  if (m.system) {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-white/5 px-3 py-1 text-center text-xs text-white/45">{m.body}</span>
      </div>
    )
  }

  const grouped = aggregate(m.reactions)
  const isTutor = m.senderAccountType === 'tutor'

  return (
    <div className="group/msg flex gap-2.5">
      <Avatar className="mt-0.5 size-8 shrink-0 ring-1 ring-white/10">
        <AvatarImage src={resolveAvatar(m.senderName, m.senderAvatar)} alt="" />
        <AvatarFallback className="bg-neutral-800 text-[10px] text-white">{initials(m.senderName)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-white/90">{mine ? 'You' : m.senderName}</span>
          {isTutor && <span className="rounded bg-primary/20 px-1 py-px text-[9px] font-bold tracking-wide text-primary uppercase">Tutor</span>}
          <span className="ml-auto shrink-0 text-[10px] text-white/30">{fmtTime(m.sentAt)}</span>
        </div>

        <div className="relative mt-1 flex items-start gap-1">
          <div className={cn('rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed', mine ? 'bg-primary/15 text-white' : 'bg-white/6 text-white/90')}>
            {m.body}
          </div>
          {/* hover react trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-label="Add reaction"
              className="mt-1 grid size-7 place-items-center rounded-full text-white/40 opacity-0 transition-opacity group-hover/msg:opacity-100 hover:bg-white/8 hover:text-white focus-visible:opacity-100 [&_svg]:size-4"
            >
              <HiOutlineFaceSmile />
            </button>
            {pickerOpen && (
              <div className="absolute top-0 left-8 z-20 flex items-center gap-0.5 rounded-full border border-white/10 bg-neutral-900 p-1 shadow-xl">
                {REACTIONS.slice(0, 6).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      onReact(e)
                      setPickerOpen(false)
                    }}
                    className="grid size-7 place-items-center rounded-full text-base transition-transform hover:scale-125 hover:bg-white/10"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {grouped.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {grouped.map((g) => (
              <button
                key={g.emoji}
                type="button"
                onClick={() => onReact(g.emoji)}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/80 transition-colors hover:bg-white/10"
              >
                <span>{g.emoji}</span>
                <span className="tabular-nums text-white/50">{g.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function aggregate(reactions: ChatMessage['reactions']) {
  const map = new Map<ReactionEmoji, number>()
  for (const r of reactions) map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1)
  return [...map.entries()].map(([emoji, count]) => ({ emoji, count }))
}

function fmtTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

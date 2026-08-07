'use client'

import * as React from 'react'
import { HiXMark, HiArrowPath } from 'react-icons/hi2'

// In-room diagnostics overlay. Enable with ?debug=1 on the classroom URL. Shows
// live realtime state + what Ably actually grants the key, so a dead room is
// debuggable without the browser Network tab.

interface Diagnostics {
  config?: { turn: boolean; sfu: boolean; ably: boolean; ready: boolean }
  access?: { ok: boolean; role?: string; canPublish?: boolean; isHost?: boolean; error?: string }
  ably?: {
    configured: boolean
    tested?: boolean
    ok?: boolean
    error?: string
    grantedOps?: string[]
    presence?: boolean
    publish?: boolean
    subscribe?: boolean
    usable?: boolean
  }
}

function Row({ label, ok, value }: { label: string; ok?: boolean; value: React.ReactNode }) {
  const dot = ok === undefined ? 'bg-white/30' : ok ? 'bg-emerald-400' : 'bg-red-400'
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-1.5 last:border-0">
      <span className="flex items-center gap-2 text-white/60">
        <span className={`size-1.5 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="text-right font-mono text-[11px] text-white/90">{value}</span>
    </div>
  )
}

export function ConnectionDebug({
  liveSessionId,
  connectionState,
  ready,
  participantCount,
}: {
  liveSessionId: string | number | null
  connectionState: string
  ready: boolean
  participantCount: number
}) {
  const [open, setOpen] = React.useState(true)
  const [diag, setDiag] = React.useState<Diagnostics | null>(null)
  const [loading, setLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!liveSessionId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/live/diagnostics?sessionId=${liveSessionId}`, { cache: 'no-store' })
      setDiag(await res.json())
    } catch (e: any) {
      setDiag({ ably: { configured: false, error: e?.message ?? 'fetch failed' } })
    } finally {
      setLoading(false)
    }
  }, [liveSessionId])

  React.useEffect(() => {
    load()
  }, [load])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-3 left-3 z-50 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-amber-300 ring-1 ring-white/15"
      >
        Debug
      </button>
    )
  }

  const a = diag?.ably
  const cfg = diag?.config
  const acc = diag?.access

  return (
    <div className="absolute bottom-3 left-3 z-50 w-[300px] rounded-xl border border-white/15 bg-neutral-950/95 p-3 text-xs text-white shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-amber-300">Live diagnostics</span>
        <div className="flex items-center gap-1">
          <button onClick={load} aria-label="Refresh" className="grid size-6 place-items-center rounded text-white/60 hover:bg-white/10 [&_svg]:size-3.5">
            <HiArrowPath className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setOpen(false)} aria-label="Close" className="grid size-6 place-items-center rounded text-white/60 hover:bg-white/10 [&_svg]:size-4">
            <HiXMark />
          </button>
        </div>
      </div>

      <Row label="Ably connection" ok={connectionState === 'connected'} value={connectionState} />
      <Row label="Room ready" ok={ready} value={String(ready)} />
      <Row label="Participants (incl. you)" value={participantCount} />
      <Row label="Session id" value={String(liveSessionId ?? '—')} />

      <div className="mt-2 mb-1 text-[10px] font-semibold tracking-wide text-white/40 uppercase">Backend config</div>
      <Row label="SFU (Cloudflare)" ok={cfg?.sfu} value={String(cfg?.sfu ?? '…')} />
      <Row label="TURN" ok={cfg?.turn} value={String(cfg?.turn ?? '…')} />
      <Row label="Ably key present" ok={cfg?.ably} value={String(cfg?.ably ?? '…')} />

      <div className="mt-2 mb-1 text-[10px] font-semibold tracking-wide text-white/40 uppercase">Your access</div>
      <Row label="Role" value={acc?.role ?? '…'} />
      <Row label="Can publish media" ok={acc?.canPublish} value={String(acc?.canPublish ?? '…')} />

      <div className="mt-2 mb-1 text-[10px] font-semibold tracking-wide text-white/40 uppercase">Ably key capabilities</div>
      {a?.error ? (
        <p className="rounded bg-red-500/15 px-2 py-1.5 font-mono text-[10px] break-words text-red-300">{a.error}</p>
      ) : (
        <>
          <Row label="presence" ok={a?.presence} value={String(a?.presence ?? '…')} />
          <Row label="publish" ok={a?.publish} value={String(a?.publish ?? '…')} />
          <Row label="subscribe" ok={a?.subscribe} value={String(a?.subscribe ?? '…')} />
          {a && a.usable === false && (
            <p className="mt-2 rounded bg-amber-400/15 px-2 py-1.5 text-[10px] leading-snug text-amber-200">
              Key is missing <b>presence</b> and/or <b>publish</b>. Enable Publish + Subscribe +
              Presence + History on the Ably key (resource <code>*</code>), or use the app’s root key.
            </p>
          )}
        </>
      )}
    </div>
  )
}

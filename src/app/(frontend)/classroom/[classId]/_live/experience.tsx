'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  HiOutlineUsers,
  HiOutlinePresentationChartBar,
  HiXMark,
  HiOutlineChatBubbleOvalLeft,
  HiOutlineHandRaised,
  HiBolt,
  HiOutlineCheckCircle,
  HiOutlineNoSymbol,
  HiOutlineUserPlus,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'
import type {
  ChatMessage,
  ClassroomBootstrap,
  Participant,
  PanelKind,
  Phase,
  ReactionEmoji,
} from './types'
import { buildInitialState } from './initial-state'
import { useSfx } from './use-sfx'
import { useLocalMedia } from './use-local-media'
import { useIsDesktop } from './use-media-query'
import { useRealtimeRoom } from './rtc/use-realtime-room'
import type { RoomParticipant } from './rtc/realtime-room'
import { roomToast, messageToast } from './room-toast'
import { PreJoinLobby } from './pre-join-lobby'
import { WaitingRoom } from './waiting-room'
import { Stage } from './stage'
import { ControlBar } from './control-bar'
import { ChatPanel } from './chat-panel'
import { PeoplePanel } from './people-panel'
import { BoardsPanel, type WBOp } from './boards-panel'
import { CreditMeter } from './credit-meter'
import { EndedScreen } from './ended-screen'
import { ReactionsLayer, type FloatingReaction } from './reactions'

let RID = 0
const rid = () => `r_${++RID}_${performance.now().toFixed(0)}`

interface RealtimeProps {
  liveSessionId: string | number
  user: { id: string; name: string; accountType: 'tutor' | 'student' | 'parent'; role: 'host' | 'publisher' | 'viewer' }
  canPublish: boolean
}

interface StatusResponse {
  status?: 'live' | 'inactive' | 'ended' | 'waiting'
  sessionId?: string | number
  roomId?: string
  startedAt?: string
}

export function ClassroomExperience({ bootstrap }: { bootstrap: ClassroomBootstrap }) {
  const router = useRouter()
  const { role, identity, classId } = bootstrap
  const isTutor = role === 'tutor'
  const initial = React.useMemo(() => buildInitialState(bootstrap), [bootstrap])

  const [phase, setPhase] = React.useState<Phase>('lobby')
  const [local, setLocal] = React.useState<Participant>(initial.localUser)
  const [remote, setRemote] = React.useState<Participant[]>(initial.remote)
  const [chat, setChat] = React.useState<ChatMessage[]>(initial.chat)
  const [boards, setBoards] = React.useState(initial.whiteboards)
  const [credit, setCredit] = React.useState(initial.credit)
  const [session, setSession] = React.useState(initial.session)

  // The active live-session id: known upfront when the tutor already started;
  // resolved via status polling for a student who arrives before the tutor.
  const [liveSessionId, setLiveSessionId] = React.useState<string | number | null>(
    bootstrap.liveSessionId,
  )
  const liveSessionIdRef = React.useRef(liveSessionId)
  React.useEffect(() => {
    liveSessionIdRef.current = liveSessionId
  }, [liveSessionId])

  // Tracks mount state so post-await state updates (e.g. after a poll+join) don't
  // fire on an unmounted component.
  const mountedRef = React.useRef(true)
  React.useEffect(() => () => { mountedRef.current = false }, [])
  // When the live session actually started — used to seed the elapsed clock so a
  // late joiner sees the real running time, not 00:00.
  const startedAtRef = React.useRef<string | null>(bootstrap.startedAt ?? null)

  const [panel, setPanel] = React.useState<PanelKind>(null)
  const [whiteboardOn, setWhiteboardOn] = React.useState(false)
  const [activeBoard, setActiveBoard] = React.useState<string | null>(initial.whiteboards[0]?.id ?? null)
  const [floating, setFloating] = React.useState<FloatingReaction[]>([])
  const [wbOps, setWbOps] = React.useState<WBOp[]>([])
  const [unread, setUnread] = React.useState(0)
  const [elapsed, setElapsed] = React.useState(0)
  const [soundOn] = React.useState(true)

  const playSfx = useSfx(soundOn)
  const media = useLocalMedia()
  const isDesktop = useIsDesktop()

  // Real realtime is active once the tutor has started (we hold a live-session
  // id) and we have a real identity. The backend readiness is already enforced
  // server-side (page.tsx renders <ClassroomUnavailable/> otherwise).
  const realtime = React.useMemo<RealtimeProps | undefined>(() => {
    if (!identity || !liveSessionId) return undefined
    return {
      liveSessionId,
      user: { id: identity.id, name: identity.name, accountType: identity.accountType, role: identity.role },
      canPublish: identity.canPublish,
    }
  }, [identity, liveSessionId])

  const realtimeEnabled = bootstrap.ready && !!realtime
  const localId = identity?.id ?? local.id
  const lowFiredRef = React.useRef(false)
  // The Ably presence roster + connection state, mirrored into a ref so the
  // billing heartbeat (a long-lived interval) can read the CURRENT roster without
  // re-subscribing every render.
  const rosterRef = React.useRef<{ ids: string[]; connected: boolean }>({ ids: [], connected: false })
  // Peak attendee count seen this session — used for the ended-screen summary.
  const peakAttendeesRef = React.useRef(1)
  // Op ids we originated this session — used to drop Ably's LIVE echo of our own
  // whiteboard ops (which our optimistic local draw already applied) WITHOUT
  // dropping rewound history on rejoin (a fresh mount has an empty set, so our
  // own replayed ops repaint the board instead of vanishing).
  const wbLocalOpIds = React.useRef<Set<string>>(new Set())

  // The media hook owns the real mic/cam track state; mirror it onto the local
  // participant so the stage tile + roster reflect it.
  React.useEffect(() => {
    setLocal((p) => ({ ...p, micOn: media.micOn, camOn: media.camOn }))
  }, [media.micOn, media.camOn])

  // Release camera/mic when the class is over.
  const stopMedia = media.stop
  React.useEffect(() => {
    if (phase === 'ended') stopMedia()
  }, [phase, stopMedia])

  // ── lifecycle helpers ────────────────────────────────────────────────────
  const fetchStatus = React.useCallback(async (): Promise<StatusResponse | null> => {
    try {
      const res = await fetch(`/api/live-sessions/status?classId=${classId}`, { cache: 'no-store' })
      if (!res.ok) return null
      return (await res.json()) as StatusResponse
    } catch {
      return null
    }
  }, [classId])

  // Register participation server-side (creates the billing/attendance log).
  // Returns false when the join is rejected (e.g. removed by the tutor).
  const doJoin = React.useCallback(
    async (sid: string | number): Promise<boolean> => {
      try {
        const res = await fetch('/api/live-sessions/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classId, sessionId: sid }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          roomToast({
            title: data?.error || 'Unable to join the class',
            tone: 'error',
            icon: <HiOutlineExclamationTriangle />,
          })
          return false
        }
        return true
      } catch {
        roomToast({ title: 'Network error joining the class', tone: 'error', icon: <HiOutlineExclamationTriangle /> })
        return false
      }
    },
    [classId],
  )

  const goLive = React.useCallback(() => {
    setSession((s) => ({ ...s, status: 'live' }))
    setPhase('live')
  }, [])

  // Tutor: ensure a live session exists (one may already have been created from
  // the class page), register as host, then enter.
  const startAsTutor = React.useCallback(async () => {
    let sid = liveSessionIdRef.current
    if (!sid) {
      try {
        const res = await fetch('/api/live-sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.session?.id) {
          roomToast({
            title: data?.error || 'Could not start the live class',
            tone: 'error',
            icon: <HiOutlineExclamationTriangle />,
          })
          return
        }
        sid = data.session.id
      } catch {
        roomToast({ title: 'Network error starting the class', tone: 'error', icon: <HiOutlineExclamationTriangle /> })
        return
      }
    }
    setLiveSessionId(sid)
    // Host participation log — also lets the SFU bind the tutor's published
    // tracks. If it fails (e.g. removed / auth race) don't go live with no log,
    // which would leave the tutor unable to publish; doJoin surfaced the reason.
    if (!(await doJoin(sid!))) return
    playSfx('join')
    goLive()
  }, [classId, doJoin, goLive, playSfx])

  // Student: enter if the tutor has already started; otherwise drop into the
  // waiting lounge, which polls and auto-joins the moment the class goes live.
  const joinAsStudent = React.useCallback(async () => {
    const status = await fetchStatus()
    if (status?.status === 'live' && status.sessionId) {
      if (status.startedAt) startedAtRef.current = status.startedAt
      setLiveSessionId(status.sessionId)
      const ok = await doJoin(status.sessionId)
      if (!mountedRef.current) return
      if (ok) {
        playSfx('join')
        goLive()
      }
    } else {
      setPhase('waiting')
    }
  }, [fetchStatus, doJoin, goLive, playSfx])

  const join = React.useCallback(() => {
    if (isTutor) return void startAsTutor()
    return void joinAsStudent()
  }, [isTutor, startAsTutor, joinAsStudent])

  // Leaving: the tutor ends the session for everyone; a student just checks out
  // (finalising their billable duration). Best-effort — teardown also runs
  // server-side via presence reconciliation + the live-sweep cron.
  const endedRef = React.useRef(false)
  const leave = React.useCallback(() => {
    const sid = liveSessionIdRef.current
    if (sid && !endedRef.current) {
      endedRef.current = true
      if (isTutor) {
        fetch(`/api/live-sessions/${sid}/end`, { method: 'POST', keepalive: true }).catch(() => {})
      } else {
        fetch('/api/live-sessions/leave', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sid }),
        }).catch(() => {})
      }
    }
    setPhase('ended')
    setPanel(null)
  }, [isTutor])

  // ── student waiting lounge: poll until the tutor starts, then auto-join ────
  React.useEffect(() => {
    if (isTutor || phase !== 'waiting') return
    let alive = true
    const poll = async () => {
      const status = await fetchStatus()
      if (!alive || !status) return
      if (status.status === 'live' && status.sessionId) {
        alive = false
        if (status.startedAt) startedAtRef.current = status.startedAt
        setLiveSessionId(status.sessionId)
        const ok = await doJoin(status.sessionId)
        if (!mountedRef.current) return
        if (!ok) {
          setPhase('ended')
          return
        }
        playSfx('join')
        roomToast({
          title: 'Your tutor started the class',
          description: 'Joining now…',
          tone: 'success',
          icon: <HiOutlineCheckCircle />,
        })
        goLive()
      }
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [isTutor, phase, fetchStatus, doJoin, goLive, playSfx])

  // ── live timers: elapsed clock ────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== 'live') return
    // Seed from the real session start so a late joiner sees the running time,
    // not 00:00. (Done in an effect, not useState init, to avoid an SSR/CSR
    // hydration mismatch from Date.now().)
    const startedAt = startedAtRef.current
    if (startedAt) {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)))
    }
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  // ── real billing heartbeat: tutor drives per-minute charging ──────────────
  React.useEffect(() => {
    if (!(realtimeEnabled && isTutor && phase === 'live' && realtime)) return
    let cancelled = false
    const beat = async () => {
      try {
        // Carry the presence roster so the server can check out students who
        // dropped without a /leave beacon (stops ghost-log over-billing). Only
        // when we actually have a connected roster — never mass-checkout on a
        // transient empty read.
        const roster = rosterRef.current
        const res = await fetch('/api/live/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: realtime.liveSessionId,
            activeUserIds: roster.connected && roster.ids.length > 0 ? roster.ids : undefined,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (data.ended) {
          roomToast({ title: 'Out of credits', description: 'The class is ending…', tone: 'error', icon: <HiOutlineExclamationTriangle /> })
          endedRef.current = true // the server already ended it — don't re-POST /end
          setTimeout(leave, 1200)
          return
        }
        if (typeof data.balance === 'number') {
          setCredit((c) => ({ ...c, balance: data.balance, consumed: data.consumed ?? c.consumed }))
        }
        if (data.lowCredit && !lowFiredRef.current) {
          lowFiredRef.current = true
          roomToast({ title: 'Credits running low', description: `About ${data.minutesRemaining} minutes of class left.`, tone: 'warning', icon: <HiBolt />, duration: 8000 })
        }
      } catch {
        /* transient — next beat retries */
      }
    }
    beat()
    const id = setInterval(beat, 20000)
    return () => { cancelled = true; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeEnabled, isTutor, phase])

  // ── real realtime (Ably presence + SFU) ─────────────────────────────────
  const room = useRealtimeRoom({
    enabled: realtimeEnabled && phase === 'live',
    liveSessionId: realtime?.liveSessionId ?? 'pending',
    user: realtime?.user ?? { id: local.id, name: local.name, accountType: local.accountType, role: local.role },
    canPublish: realtime?.canPublish ?? isTutor,
    localStream: media.stream,
    onChat: (m) => {
      const cm: ChatMessage = {
        id: m.id, senderId: m.senderId, senderName: m.senderName,
        senderAccountType: m.senderAccountType, senderAvatar: null,
        body: m.body, sentAt: m.sentAt, reactions: [],
      }
      // Dedupe by message id (covers our own optimistic echo + Ably re-delivery)
      // rather than by sender, so a legit message from our other tab isn't lost.
      let isNew = false
      setChat((c) => {
        if (c.some((x) => x.id === cm.id)) return c
        isNew = true
        return [...c, cm]
      })
      if (!isNew) return
      playSfx('message')
      if (panel !== 'chat') { setUnread((u) => u + 1); messageToast(cm) }
    },
    onReaction: (emoji, fromId) => {
      if (fromId === localId) return
      const r: FloatingReaction = { id: rid(), emoji: emoji as ReactionEmoji, x: 0.1 + Math.random() * 0.8, drift: (Math.random() - 0.5) * 80 }
      setFloating((f) => [...f, r])
      setTimeout(() => setFloating((f) => f.filter((x) => x.id !== r.id)), 2500)
    },
    onControl: (action, data) => {
      // Host-only channel (enforced server-side). Act only if we're the target.
      if (data?.targetId !== localId) return
      if (action === 'mute') {
        if (media.micOn) media.toggleMic()
        roomToast({ title: 'You were muted by the tutor', tone: 'default', icon: <HiOutlineNoSymbol /> })
      } else if (action === 'remove') {
        roomToast({ title: 'You were removed from the class', tone: 'error', icon: <HiOutlineNoSymbol /> })
        setTimeout(leave, 1200)
      } else if (action === 'promote') {
        setLocal((p) => ({ ...p, role: 'publisher' }))
        room.actions.promoteSelf(media.stream)
        roomToast({ title: "You're on stage now", description: 'Your camera and mic are live.', tone: 'success', icon: <HiOutlineUserPlus /> })
      } else if (action === 'demote') {
        setLocal((p) => ({ ...p, role: 'viewer' }))
        room.actions.demoteSelf()
        roomToast({ title: 'You were taken off stage', tone: 'default', icon: <HiOutlineNoSymbol /> })
      }
    },
    onWhiteboard: (payload) => {
      // Presentation + stroke sync from the tutor (and writable students).
      if (payload?.kind === 'op' && payload.op) {
        // Drop the LIVE echo of an op we just drew (already applied optimistically),
        // but let rewound history through (its id isn't in our local set on rejoin).
        if (wbLocalOpIds.current.has(payload.op.id)) return
        setWbOps((o) => [...o, payload.op].slice(-1000))
      } else if (payload?.kind === 'show') setWhiteboardOn(Boolean(payload.on))
      else if (payload?.kind === 'active') setActiveBoard(payload.boardId ?? null)
      else if (payload?.kind === 'writable') {
        setSession((s) => ({ ...s, whiteboardWritable: Boolean(payload.on) }))
        // A non-host student's Ably token only grants whiteboard publish while
        // writable is on — re-auth so the new capability takes effect now rather
        // than after the ~5-min token TTL.
        if (!isTutor) room.actions.reauth()
      } else if (payload?.kind === 'create' && payload.board) {
        setBoards((b) => (b.some((x) => x.id === payload.board.id) ? b : [...b, payload.board]))
      }
    },
  })

  // Mirror the live presence roster + connection state into a ref for the
  // heartbeat interval (which can't depend on them without re-subscribing).
  React.useEffect(() => {
    rosterRef.current = {
      ids: room.participants.map((p) => p.id),
      connected: room.ready && room.connectionState === 'connected',
    }
    peakAttendeesRef.current = Math.max(peakAttendeesRef.current, room.participants.length + 1)
  }, [room.participants, room.ready, room.connectionState])

  // Broadcast local mic/cam changes to presence in real mode.
  const roomUpdateMedia = room.actions.updateMedia
  React.useEffect(() => {
    if (realtimeEnabled) roomUpdateMedia({ micOn: media.micOn, camOn: media.camOn })
  }, [media.micOn, media.camOn, realtimeEnabled, roomUpdateMedia])

  // ── actions ─────────────────────────────────────────────────────────────
  const toggleHand = () => {
    const raising = !local.handRaisedAt
    setLocal((p) => ({ ...p, handRaisedAt: raising ? Date.now() : null }))
    if (raising) roomToast({ title: 'Hand raised', description: 'Your tutor has been notified.', tone: 'warning', icon: <HiOutlineHandRaised /> })
    if (realtimeEnabled) room.actions.setHand(raising)
  }

  const pushReaction = (emoji: ReactionEmoji) => {
    const r: FloatingReaction = { id: rid(), emoji, x: 0.1 + Math.random() * 0.8, drift: (Math.random() - 0.5) * 80 }
    setFloating((f) => [...f, r])
    setTimeout(() => setFloating((f) => f.filter((x) => x.id !== r.id)), 2500)
    if (realtimeEnabled) room.actions.sendReaction(emoji)
  }

  const sendChat = (body: string) => {
    const m: ChatMessage = {
      id: rid(), senderId: String(localId), senderName: local.name, senderAccountType: local.accountType,
      senderAvatar: local.avatar, body, sentAt: Date.now(), reactions: [],
    }
    setChat((c) => [...c, m]) // optimistic
    if (realtimeEnabled) {
      room.actions.sendChat({
        id: m.id, senderId: String(localId), senderName: local.name,
        senderAccountType: local.accountType, body, sentAt: m.sentAt,
      })
    }
  }

  const reactToMessage = (messageId: string, emoji: ReactionEmoji) => {
    setChat((c) =>
      c.map((m) => {
        if (m.id !== messageId) return m
        const mine = m.reactions.find((r) => r.by === local.id && r.emoji === emoji)
        return {
          ...m,
          reactions: mine
            ? m.reactions.filter((r) => !(r.by === local.id && r.emoji === emoji))
            : [...m.reactions, { emoji, by: local.id }],
        }
      }),
    )
  }

  // tutor moderation — over the control channel, backed by an authoritative
  // server write (removed/stagePublishers + close tracks + revoke tokens).
  const nameOf = (id: string) => room.participants.find((x) => x.id === id)?.name
  const moderate = (action: 'remove' | 'promote' | 'demote', targetId: string): Promise<unknown> => {
    if (!realtime) return Promise.resolve()
    return fetch('/api/live/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: realtime.liveSessionId, action, targetId }),
    }).catch(() => {})
  }
  const promote = async (id: string) => {
    const name = nameOf(id)
    if (realtimeEnabled) {
      // Await the authoritative stagePublishers write BEFORE telling the student
      // to publish — otherwise their publish reaches the SFU proxy before the
      // roster update lands and gets 403'd.
      await moderate('promote', id)
      room.actions.sendControl('promote', { targetId: id })
    }
    roomToast({ title: `${name ?? 'Student'} is on stage`, tone: 'success', icon: <HiOutlineUserPlus /> })
  }
  const muteOne = (id: string) => {
    if (realtimeEnabled) room.actions.sendControl('mute', { targetId: id })
    roomToast({ title: 'Participant muted', tone: 'default', icon: <HiOutlineNoSymbol /> })
  }
  const removeOne = (id: string) => {
    const name = nameOf(id)
    if (realtimeEnabled) {
      moderate('remove', id) // authoritative: removed flag + close tracks + revoke token
      room.actions.sendControl('remove', { targetId: id })
    }
    roomToast({ title: `${name ?? 'Participant'} removed`, description: 'They can no longer join this class.', tone: 'error', icon: <HiOutlineNoSymbol /> })
  }

  const openPanel = (k: Exclude<PanelKind, null>) => {
    setPanel((cur) => (cur === k ? null : k))
    if (k === 'chat') setUnread(0)
  }

  const createBoard = () => {
    const id = `wb_${boards.length + 1}_${rid()}`
    const nb = { id, title: `Board ${boards.length + 1}`, hue: (boards.length * 47) % 360, createdBy: String(localId) }
    setBoards((b) => [...b, nb])
    setActiveBoard(id)
    if (!whiteboardOn) setWhiteboardOn(true)
    if (realtimeEnabled) {
      room.actions.sendWhiteboard({ kind: 'create', board: nb })
      room.actions.sendWhiteboard({ kind: 'active', boardId: id })
      room.actions.sendWhiteboard({ kind: 'show', on: true })
    }
    roomToast({ title: 'New whiteboard created', tone: 'success', icon: <HiOutlinePresentationChartBar /> })
  }

  const selectBoard = (id: string) => {
    setActiveBoard(id)
    if (realtimeEnabled) room.actions.sendWhiteboard({ kind: 'active', boardId: id })
  }

  const toggleWritable = () => {
    const next = !session.whiteboardWritable
    setSession((s) => ({ ...s, whiteboardWritable: next }))
    if (realtimeEnabled && realtime) {
      // Persist FIRST so a student's token re-auth mints the new whiteboard
      // capability from a DB that already reflects the toggle. Only broadcast (and
      // trigger student re-auth) if the write actually landed — otherwise the UI
      // would flip while the server-enforced capability stayed on the old value.
      fetch(`/api/live-sessions/${realtime.liveSessionId}/whiteboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whiteboardWritable: next }),
      })
        .then((res) => {
          if (res.ok) room.actions.sendWhiteboard({ kind: 'writable', on: next })
          else setSession((s) => ({ ...s, whiteboardWritable: !next })) // revert
        })
        .catch(() => setSession((s) => ({ ...s, whiteboardWritable: !next })))
    }
  }

  const toggleWhiteboard = () => {
    const next = !whiteboardOn
    setWhiteboardOn(next)
    if (realtimeEnabled) room.actions.sendWhiteboard({ kind: 'show', on: next })
    roomToast({
      title: next ? 'Whiteboard is live' : 'Whiteboard hidden',
      description: next ? 'Everyone can see it now.' : undefined,
      tone: 'default',
      icon: <HiOutlinePresentationChartBar />,
    })
  }

  // ── render by phase ──────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <PreJoinLobby
        session={session}
        localUser={local}
        isTutor={isTutor}
        media={media}
        onJoin={join}
      />
    )
  }

  if (phase === 'waiting') {
    return (
      <WaitingRoom
        session={session}
        localUser={local}
        waiting={[local]}
        isTutor={isTutor}
        media={media}
        onLeave={() => router.push('/dashboard')}
        onTutorStart={startAsTutor}
      />
    )
  }

  if (phase === 'ended') {
    return (
      <EndedScreen
        session={session}
        isTutor={isTutor}
        durationLabel={fmtClock(elapsed)}
        attendees={peakAttendeesRef.current}
        creditsSpent={credit.consumed}
        onLeave={() => router.push('/dashboard')}
      />
    )
  }

  // ── LIVE ──────────────────────────────────────────────────────────────
  // The roster comes from Ably presence; the local participant always renders
  // from our own state.
  const effectiveRemote =
    realtimeEnabled && room.ready
      ? room.participants.filter((p) => p.id !== String(localId)).map(roomToParticipant)
      : remote
  const remoteStreams = realtimeEnabled ? room.streams : undefined
  const everyone = [local, ...effectiveRemote]
  const handCount = effectiveRemote.filter((p) => p.handRaisedAt).length

  const panelContent =
    panel === 'people' ? (
      <PeoplePanel everyone={everyone} isTutor={isTutor} onPromote={promote} onMute={muteOne} onRemove={removeOne} />
    ) : panel === 'chat' ? (
      <ChatPanel messages={chat} localUser={local} onSend={sendChat} onReact={reactToMessage} />
    ) : null

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-neutral-950 text-white">
      {/* Top bar */}
      <header className="z-20 flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-300">
            <span className="size-1.5 animate-pulse rounded-full bg-red-400" /> LIVE
          </span>
          <span className="tabular-nums text-sm font-medium text-white/60">{fmtClock(elapsed)}</span>
          {realtimeEnabled && room.connectionState !== 'connected' && room.connectionState !== 'initialized' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
              {room.connectionState === 'failed' ? 'Connection lost' : 'Reconnecting…'}
            </span>
          )}
          <span className="hidden min-w-0 truncate text-sm font-medium text-white/80 sm:block">· {session.classTitle}</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {isTutor && <CreditMeter credit={credit} compact />}
          {isTutor && (
            <TopButton active={whiteboardOn} onClick={toggleWhiteboard} label="Present whiteboard">
              <HiOutlinePresentationChartBar />
            </TopButton>
          )}
          <TopButton active={panel === 'people'} onClick={() => openPanel('people')} label="People" badge={isTutor && handCount ? handCount : undefined}>
            <HiOutlineUsers />
          </TopButton>
        </div>
      </header>

      {/* Body: stage (+ docked panel on desktop) */}
      <div className="relative flex min-h-0 flex-1 gap-3 px-3 pb-2 sm:px-4">
        <main className="relative min-w-0 flex-1">
          <ReactionsLayer items={floating} />
          {whiteboardOn ? (
            <Stage participants={everyone} localStream={media.stream} remoteStreams={remoteStreams} filmstrip>
              <BoardsPanel
                boards={boards}
                activeId={activeBoard}
                isTutor={isTutor}
                writable={session.whiteboardWritable}
                onSelect={selectBoard}
                onCreate={createBoard}
                onToggleWritable={toggleWritable}
                onClose={toggleWhiteboard}
                onDraw={(op) => {
                  if (!realtimeEnabled) return
                  wbLocalOpIds.current.add(op.id)
                  room.actions.sendWhiteboard({ kind: 'op', op })
                }}
                remoteOps={realtimeEnabled ? wbOps : undefined}
              />
            </Stage>
          ) : (
            <Stage participants={everyone} localStream={media.stream} remoteStreams={remoteStreams} />
          )}
        </main>

        {/* Desktop docked panel */}
        {panel && (
          <aside className="hidden w-[340px] shrink-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 backdrop-blur-xl lg:flex">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                {panel === 'chat' ? <HiOutlineChatBubbleOvalLeft className="size-4" /> : <HiOutlineUsers className="size-4" />}
                {panel === 'chat' ? 'In-class chat' : `People · ${everyone.length}`}
              </h2>
              <button onClick={() => setPanel(null)} aria-label="Close panel" className="grid size-7 place-items-center rounded-lg text-white/50 hover:bg-white/8 hover:text-white [&_svg]:size-4">
                <HiXMark />
              </button>
            </div>
            <div className="min-h-0 flex-1">{panelContent}</div>
          </aside>
        )}
      </div>

      {/* Bottom control bar */}
      <footer className="z-20 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        <ControlBar
          micOn={media.micOn}
          camOn={media.camOn}
          handRaised={Boolean(local.handRaisedAt)}
          unreadChat={unread}
          onToggleMic={media.toggleMic}
          onToggleCam={media.toggleCam}
          onToggleHand={toggleHand}
          onReact={pushReaction}
          onToggleChat={() => openPanel('chat')}
          onLeave={leave}
        />
      </footer>

      {/* Mobile panel as a bottom sheet — only mounted below lg so its
          full-screen overlay never blurs the desktop docked layout. */}
      <Sheet open={!!panel && !isDesktop} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent
          side="bottom"
          className="flex h-[82dvh] flex-col gap-0 rounded-t-3xl border-white/10 bg-neutral-900 p-0 text-white lg:hidden [&>button]:hidden"
        >
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold text-white">
              {panel === 'chat' ? <HiOutlineChatBubbleOvalLeft className="size-4" /> : <HiOutlineUsers className="size-4" />}
              {panel === 'chat' ? 'In-class chat' : `People · ${everyone.length}`}
            </SheetTitle>
            <button onClick={() => setPanel(null)} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/8 [&_svg]:size-5">
              <HiXMark />
            </button>
          </div>
          <div className="min-h-0 flex-1">{panelContent}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function TopButton({
  children,
  active,
  onClick,
  label,
  badge,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  label: string
  badge?: number | false
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'relative grid size-10 place-items-center rounded-xl border transition-all [&_svg]:size-5',
        active ? 'border-primary/40 bg-primary text-primary-foreground' : 'border-white/10 bg-white/5 text-white hover:bg-white/10',
      )}
    >
      {children}
      {badge ? (
        <span className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-neutral-900 ring-2 ring-neutral-950">
          {badge}
        </span>
      ) : null}
    </button>
  )
}

/** Map an Ably-presence participant to the UI Participant shape. */
function roomToParticipant(p: RoomParticipant): Participant {
  return {
    id: p.id,
    name: p.name,
    accountType: p.accountType,
    role: p.role,
    avatar: null,
    micOn: p.micOn,
    camOn: p.camOn,
    handRaisedAt: p.handRaisedAt ?? null,
    isLocal: false,
  }
}

function fmtClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

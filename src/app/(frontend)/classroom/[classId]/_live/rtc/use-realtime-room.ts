'use client'

import * as React from 'react'
import { RealtimeRoom, type RoomParticipant, type ChatMessagePayload } from './realtime-room'

// React lifecycle wrapper around RealtimeRoom. Fetches ICE, joins on mount,
// leaves on unmount, and surfaces presence participants, remote streams, and a
// connection state to the classroom. Callbacks let the classroom fold realtime
// events into its own state (chat append, reaction burst, etc.).

export interface RealtimeRoomActions {
  sendChat: (msg: ChatMessagePayload) => void
  sendReaction: (emoji: string) => void
  setHand: (raised: boolean) => void
  updateMedia: (next: { micOn?: boolean; camOn?: boolean }) => void
  sendControl: (action: string, data?: any) => void
  sendWhiteboard: (op: any) => void
  promoteSelf: (stream: MediaStream | null) => void
  demoteSelf: () => void
}

export interface UseRealtimeRoomResult {
  connectionState: string
  participants: RoomParticipant[]
  streams: Map<string, MediaStream>
  actions: RealtimeRoomActions
  ready: boolean
}

const NOOP_ACTIONS: RealtimeRoomActions = {
  sendChat: () => {},
  sendReaction: () => {},
  setHand: () => {},
  updateMedia: () => {},
  sendControl: () => {},
  sendWhiteboard: () => {},
  promoteSelf: () => {},
  demoteSelf: () => {},
}

export function useRealtimeRoom(opts: {
  enabled: boolean
  liveSessionId: string | number
  user: { id: string; name: string; accountType: 'tutor' | 'student' | 'parent'; role: 'host' | 'publisher' | 'viewer' }
  canPublish: boolean
  localStream: MediaStream | null
  onChat?: (msg: ChatMessagePayload) => void
  onReaction?: (emoji: string, fromId: string) => void
  onControl?: (action: string, data: any, fromId: string) => void
  onWhiteboard?: (op: any, fromId: string) => void
}): UseRealtimeRoomResult {
  const [connectionState, setConnectionState] = React.useState('initialized')
  const [participants, setParticipants] = React.useState<RoomParticipant[]>([])
  const [streams, setStreams] = React.useState<Map<string, MediaStream>>(new Map())
  const [ready, setReady] = React.useState(false)
  const roomRef = React.useRef<RealtimeRoom | null>(null)

  // Keep callback refs current without re-joining.
  const cbs = React.useRef({ onChat: opts.onChat, onReaction: opts.onReaction, onControl: opts.onControl, onWhiteboard: opts.onWhiteboard })
  cbs.current = { onChat: opts.onChat, onReaction: opts.onReaction, onControl: opts.onControl, onWhiteboard: opts.onWhiteboard }

  const { enabled, liveSessionId, canPublish, localStream } = opts
  const userKey = `${opts.user.id}:${opts.user.role}`

  React.useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let room: RealtimeRoom | null = null

    ;(async () => {
      try {
        const iceRes = await fetch(`/api/live/ice?sessionId=${liveSessionId}`, { cache: 'no-store' })
        const iceServers = iceRes.ok ? (await iceRes.json()).iceServers : []
        if (cancelled) return

        room = new RealtimeRoom({
          liveSessionId,
          user: opts.user,
          iceServers,
          canPublish,
          events: {
            onConnectionState: (s) => setConnectionState(s),
            onParticipants: (list) => setParticipants(list),
            onStream: (userId, stream) =>
              setStreams((prev) => new Map(prev).set(userId, stream)),
            onStreamGone: (userId) =>
              setStreams((prev) => {
                const next = new Map(prev)
                next.delete(userId)
                return next
              }),
            onChat: (m) => cbs.current.onChat?.(m),
            onReaction: (e, from) => cbs.current.onReaction?.(e, from),
            onControl: (a, d, from) => cbs.current.onControl?.(a, d, from),
            onWhiteboard: (o, from) => cbs.current.onWhiteboard?.(o, from),
          },
        })
        roomRef.current = room
        await room.join(localStream)
        // Publish now if media was already granted (join covers the ready case);
        // the effect below covers a stream that arrives after join.
        if (!cancelled && localStream) room.publishStream(localStream).catch(() => {})
        if (!cancelled) setReady(true)
      } catch (err) {
        console.error('[useRealtimeRoom] join failed', err)
        if (!cancelled) setConnectionState('failed')
      }
    })()

    return () => {
      cancelled = true
      setReady(false)
      roomRef.current = null
      room?.leave().catch(() => {})
    }
    // Re-join only when identity/session/publish-capability changes, NOT on
    // every localStream toggle (media updates flow through updateMedia).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, liveSessionId, userKey, canPublish])

  // Publish the local stream once getUserMedia resolves (publishers commonly go
  // live before the camera is granted). publishStream is idempotent.
  React.useEffect(() => {
    if (!enabled || !ready || !localStream || localStream.getTracks().length === 0) return
    roomRef.current?.publishStream(localStream).catch(() => {})
  }, [enabled, ready, localStream])

  const actions = React.useMemo<RealtimeRoomActions>(() => {
    if (!enabled) return NOOP_ACTIONS
    return {
      sendChat: (msg) => roomRef.current?.sendChat(msg).catch(() => {}),
      sendReaction: (emoji) => roomRef.current?.sendReaction(emoji).catch(() => {}),
      setHand: (raised) => roomRef.current?.setHand(raised).catch(() => {}),
      updateMedia: (next) => roomRef.current?.updateMedia(next).catch(() => {}),
      sendControl: (action, data) => roomRef.current?.sendControl(action, data).catch(() => {}),
      sendWhiteboard: (op) => roomRef.current?.sendWhiteboard(op).catch(() => {}),
      promoteSelf: (stream) => roomRef.current?.promoteToStage(stream).catch(() => {}),
      demoteSelf: () => roomRef.current?.demoteSelf().catch(() => {}),
    }
  }, [enabled])

  return { connectionState, participants, streams, actions, ready }
}

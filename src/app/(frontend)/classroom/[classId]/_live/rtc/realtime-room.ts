'use client'

import { io, type Socket } from 'socket.io-client'
import { PeerManager } from './webrtc'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PresenceData,
  RoomParticipant,
  ChatMessagePayload,
} from '@/lib/live/socket-types'

// The realtime "room": one Socket.IO connection + one WebRTC mesh, wired
// together. This REPLACES the old Ably + Cloudflare SFU engine. The public
// surface (constructor options, methods, events) is unchanged, so the React hook
// and the classroom UI don't care how the bytes move.
//
//  - Data plane (presence / chat / reactions / control / whiteboard): Socket.IO
//    events on our own server (server.ts).
//  - Media plane (audio / video): a direct peer-to-peer mesh — every browser
//    connects straight to every other participant. The server only relays the
//    WebRTC offer/answer/ICE ("signal") and never sees the media.
//
// Auth: the socket presents a short-lived signed token from /api/live/socket-token
// (which runs the full Payload membership check). Participant identity is the app
// user id, so peers, presence and remote streams are all keyed the same way.

export type ReactionEmoji = string
export type { PresenceData, RoomParticipant, ChatMessagePayload }

export interface RoomEvents {
  onParticipants?: (list: RoomParticipant[]) => void
  onStream?: (userId: string, stream: MediaStream) => void
  onStreamGone?: (userId: string) => void
  onChat?: (msg: ChatMessagePayload) => void
  onReaction?: (emoji: ReactionEmoji, fromId: string) => void
  onControl?: (action: string, data: any, fromId: string) => void
  onWhiteboard?: (op: any, fromId: string) => void
  onConnectionState?: (state: string) => void
  /** Aggregate PeerConnection (media) state — for diagnostics. */
  onMediaState?: (state: string) => void
}

export interface RoomOptions {
  liveSessionId: string | number
  user: { id: string; name: string; accountType: 'tutor' | 'student' | 'parent'; role: 'host' | 'publisher' | 'viewer' }
  iceServers: RTCIceServer[]
  canPublish: boolean
  events: RoomEvents
}

export class RealtimeRoom {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private pm: PeerManager | null = null
  private token: string | null = null

  private readonly selfId: string
  private canPublishNow: boolean
  private closed = false
  private joinedOnce = false
  /** Aggregated remote stream per peer (userId → stream) for teardown events. */
  private streams = new Map<string, MediaStream>()
  /** The current local stream we publish (kept so a reconnect re-attaches it). */
  private localStream: MediaStream | null = null
  private local: PresenceData

  constructor(private readonly opts: RoomOptions) {
    this.selfId = String(opts.user.id)
    this.canPublishNow = opts.canPublish
    this.local = {
      name: opts.user.name,
      accountType: opts.user.accountType,
      role: opts.user.role,
      micOn: true,
      camOn: true,
      handRaisedAt: null,
    }
  }

  async join(localStream: MediaStream | null): Promise<void> {
    this.localStream = localStream

    // Mint the socket token first (fails fast with a clear reason if we're not a
    // member / the session ended). The React hook retries join() with backoff.
    const res = await fetch(`/api/live/socket-token?sessionId=${this.opts.liveSessionId}`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`socket-token ${res.status} ${body}`)
    }
    this.token = (await res.json()).token as string
    if (this.closed) return

    // Build the mesh engine now — selfId is the stable app user id, so we don't
    // need the socket id first. Publishers attach their real tracks; observers
    // (parents) attach an empty stream and still receive everyone else.
    const meshStream = this.canPublishNow && localStream ? localStream : new MediaStream()
    this.pm = new PeerManager(
      this.selfId,
      meshStream,
      {
        sendSignal: (to, data) => this.socket?.emit('signal', { to, data }),
        onTrack: (peerId, stream) => {
          this.streams.set(peerId, stream)
          this.opts.events.onStream?.(peerId, stream)
        },
        onState: (_peerId, state) => this.opts.events.onMediaState?.(state),
      },
      this.opts.iceServers,
    )

    await new Promise<void>((resolve, reject) => {
      this.opts.events.onConnectionState?.('connecting')
      const socket = io({
        autoConnect: false,
        transports: ['websocket', 'polling'],
        // Keep trying to reconnect for as long as the class is open — a bad
        // network should recover whenever it comes back, not go permanently dead
        // after a handful of attempts. Backoff is capped so we don't hammer.
        reconnectionAttempts: Infinity,
        reconnectionDelay: 800,
        reconnectionDelayMax: 8000,
        randomizationFactor: 0.5,
        timeout: 20000,
      })
      this.socket = socket

      let settled = false
      const timeout = setTimeout(() => {
        if (settled) return
        settled = true
        reject(new Error('socket connect timeout'))
      }, 15000)

      socket.on('connect', () => {
        // (Re)join on every connect — a reconnect gets a new socket id, so we
        // rebuild the mesh from scratch (peers evicted our stale connection).
        if (this.joinedOnce) {
          this.rebuildMesh()
        }
        socket.emit('join', { token: this.token! })
      })

      socket.on('joined', ({ self, peers, chat, whiteboard, whiteboardWritable }) => {
        this.joinedOnce = true
        this.opts.events.onConnectionState?.('connected')
        void self
        void whiteboardWritable
        // Replay buffered history (dedup happens in the UI by message/op id).
        for (const m of chat) this.opts.events.onChat?.(m)
        for (const op of whiteboard) this.opts.events.onWhiteboard?.(op, '')
        this.applyRoster([self, ...peers])
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          resolve()
        }
      })

      socket.on('roster', (participants) => this.applyRoster(participants))

      socket.on('signal', ({ from, data }) => {
        void this.pm?.handleSignal(from, data)
      })

      socket.on('chat', (m) => this.opts.events.onChat?.(m))
      socket.on('reaction', ({ emoji, from }) => this.opts.events.onReaction?.(emoji, from))
      socket.on('control', ({ action, data, from }) => this.opts.events.onControl?.(action, data, from))
      socket.on('whiteboard', ({ op, from }) => this.opts.events.onWhiteboard?.(op, from))

      socket.on('denied', ({ message }) => {
        console.error('[room] socket join denied:', message)
        this.opts.events.onConnectionState?.('failed')
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          reject(new Error(message))
        }
      })

      socket.on('kicked', () => {
        this.opts.events.onConnectionState?.('failed')
      })

      socket.on('disconnect', () => {
        if (this.closed) return
        // Socket.IO will attempt to reconnect; show "Reconnecting…", not "lost".
        this.opts.events.onConnectionState?.('connecting')
      })

      socket.io.on('reconnect_failed', () => {
        this.opts.events.onConnectionState?.('failed')
      })

      socket.connect()
    })
  }

  /** Rebuild the mesh after a reconnect: drop stale peer connections + streams. */
  private rebuildMesh(): void {
    for (const userId of [...this.streams.keys()]) {
      this.streams.delete(userId)
      this.opts.events.onStreamGone?.(userId)
    }
    this.pm?.destroy()
    const meshStream =
      this.canPublishNow && this.localStream ? this.localStream : new MediaStream()
    this.pm = new PeerManager(
      this.selfId,
      meshStream,
      {
        sendSignal: (to, data) => this.socket?.emit('signal', { to, data }),
        onTrack: (peerId, stream) => {
          this.streams.set(peerId, stream)
          this.opts.events.onStream?.(peerId, stream)
        },
        onState: (_peerId, state) => this.opts.events.onMediaState?.(state),
      },
      this.opts.iceServers,
    )
    // Re-apply the current outgoing tracks on the fresh mesh.
    if (this.canPublishNow && this.localStream) {
      this.pm.replaceAudioTrack(this.localStream.getAudioTracks()[0] ?? null)
      this.pm.replaceVideoTrack(this.localStream.getVideoTracks()[0] ?? null)
    }
  }

  /**
   * Reconcile the roster: surface the participant list to the UI, open a mesh
   * connection to every remote peer, and tear down anyone who left.
   */
  private applyRoster(participants: RoomParticipant[]): void {
    if (this.closed || !this.pm) return
    const list = participants.map((p) => ({ ...p, isLocal: p.id === this.selfId }))
    this.opts.events.onParticipants?.(list)

    const presentIds = new Set(list.map((p) => p.id))
    // Connect to every remote peer (idempotent; politeness resolves glare).
    for (const p of list) {
      if (p.id === this.selfId) continue
      this.pm.connect(p.id)
    }
    // Drop media + connection for anyone who left the roster.
    for (const peerId of this.pm.peerIds()) {
      if (presentIds.has(peerId)) continue
      this.pm.disconnect(peerId)
      if (this.streams.has(peerId)) {
        this.streams.get(peerId)?.getTracks().forEach((t) => t.stop())
        this.streams.delete(peerId)
      }
      this.opts.events.onStreamGone?.(peerId)
    }
  }

  /** Push the current local tracks to all peers (called when media changes). */
  async publishStream(stream: MediaStream): Promise<void> {
    if (this.closed || !this.pm) return
    this.localStream = stream
    if (!this.canPublishNow) return
    this.pm.replaceAudioTrack(stream.getAudioTracks()[0] ?? null)
    this.pm.replaceVideoTrack(stream.getVideoTracks()[0] ?? null)
  }

  /** Host promoted this viewer to the stage: grant publish + start sending. */
  async promoteToStage(stream: MediaStream | null): Promise<void> {
    this.canPublishNow = true
    this.local.role = 'publisher'
    this.localStream = stream
    if (stream && this.pm) {
      this.pm.replaceAudioTrack(stream.getAudioTracks()[0] ?? null)
      this.pm.replaceVideoTrack(stream.getVideoTracks()[0] ?? null)
    }
    this.socket?.emit('presence', { micOn: this.local.micOn, camOn: this.local.camOn })
  }

  async demoteSelf(): Promise<void> {
    this.canPublishNow = false
    this.local.role = 'viewer'
    // Stop sending media; the PCs stay up so we keep receiving the stage.
    this.pm?.replaceAudioTrack(null)
    this.pm?.replaceVideoTrack(null)
  }

  // ── outbound ──────────────────────────────────────────────────────────────
  async sendChat(msg: ChatMessagePayload): Promise<void> {
    this.socket?.emit('chat', msg)
  }
  async sendReaction(emoji: ReactionEmoji): Promise<void> {
    this.socket?.emit('reaction', { emoji })
  }
  async setHand(raised: boolean): Promise<void> {
    this.local.handRaisedAt = raised ? Date.now() : null
    this.socket?.emit('presence', { handRaisedAt: this.local.handRaisedAt })
  }
  async updateMedia(next: { micOn?: boolean; camOn?: boolean }): Promise<void> {
    this.local = { ...this.local, ...next }
    this.socket?.emit('presence', { micOn: this.local.micOn, camOn: this.local.camOn })
  }
  async sendControl(action: string, data: any = {}): Promise<void> {
    this.socket?.emit('control', { action, data })
  }
  async sendWhiteboard(op: any): Promise<void> {
    this.socket?.emit('whiteboard', { op })
  }

  /** No-op: whiteboard-writable capability is now enforced live by the server on
   *  each op, so there's no token to re-mint (kept for interface compatibility). */
  reauth(): void {}

  async leave(): Promise<void> {
    if (this.closed) return
    this.closed = true
    this.pm?.destroy()
    this.pm = null
    for (const s of this.streams.values()) s.getTracks().forEach((t) => t.stop())
    this.streams.clear()
    this.socket?.removeAllListeners()
    this.socket?.disconnect()
    this.socket = null
  }
}

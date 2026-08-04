'use client'

import * as Ably from 'ably'
import { SfuClient } from './sfu-client'

// The realtime "room": one Ably connection + one SFU client, wired together.
// Ably presence is the source of truth for WHO is in the room and WHAT SFU
// tracks they publish; this engine reacts to presence to pull remote media, and
// carries chat / reactions / hands / whiteboard / control on sub-channels.
//
// Auth: the Ably client authenticates via /api/live/ably-token (a signed,
// capability-scoped TokenRequest) — the root key never reaches the browser.

export type ReactionEmoji = string

export interface PresenceData {
  name: string
  accountType: 'tutor' | 'student' | 'parent'
  role: 'host' | 'publisher' | 'viewer'
  micOn: boolean
  camOn: boolean
  handRaisedAt?: number | null
  sfuSessionId?: string | null
  audioTrack?: string | null
  videoTrack?: string | null
}

export interface RoomParticipant extends PresenceData {
  id: string // clientId (app user id)
  isLocal: boolean
}

export interface ChatMessagePayload {
  id: string
  senderId: string
  senderName: string
  senderAccountType: 'tutor' | 'student' | 'parent'
  body: string
  sentAt: number
}

export interface RoomEvents {
  onParticipants?: (list: RoomParticipant[]) => void
  onStream?: (userId: string, stream: MediaStream) => void
  onStreamGone?: (userId: string) => void
  onChat?: (msg: ChatMessagePayload) => void
  onReaction?: (emoji: ReactionEmoji, fromId: string) => void
  onControl?: (action: string, data: any, fromId: string) => void
  onWhiteboard?: (op: any, fromId: string) => void
  onConnectionState?: (state: string) => void
}

export interface RoomOptions {
  liveSessionId: string | number
  user: { id: string; name: string; accountType: 'tutor' | 'student' | 'parent'; role: 'host' | 'publisher' | 'viewer' }
  iceServers: RTCIceServer[]
  canPublish: boolean
  events: RoomEvents
}

const CH = {
  base: (id: string | number) => `live:${id}`,
  chat: (id: string | number) => `live:${id}:chat`,
  reactions: (id: string | number) => `live:${id}:reactions`,
  hands: (id: string | number) => `live:${id}:hands`,
  whiteboard: (id: string | number) => `live:${id}:whiteboard`,
  control: (id: string | number) => `live:${id}:control`,
}

export class RealtimeRoom {
  private client: Ably.Realtime | null = null
  private sfu: SfuClient | null = null
  private base!: Ably.RealtimeChannel
  private chat!: Ably.RealtimeChannel
  private reactions!: Ably.RealtimeChannel
  private hands!: Ably.RealtimeChannel
  private whiteboard!: Ably.RealtimeChannel
  private control!: Ably.RealtimeChannel

  private local: PresenceData
  private streams = new Map<string, MediaStream>() // userId → aggregated stream
  private pulled = new Set<string>() // `${sfuSessionId}:${trackName}` already pulled
  private sfuToUser = new Map<string, string>() // sfuSessionId → userId
  private closed = false
  private entered = false
  private published = false
  private publishing = false
  private canPublishNow: boolean
  private reconciling = false
  private reconcileQueued = false
  private pullFailures = new Map<string, number>() // key → failed attempts
  private lastStream: MediaStream | null = null // last stream we published (for media rebuild)

  constructor(private readonly opts: RoomOptions) {
    this.local = {
      name: opts.user.name,
      accountType: opts.user.accountType,
      role: opts.user.role,
      micOn: true,
      camOn: true,
      handRaisedAt: null,
      sfuSessionId: null,
      audioTrack: null,
      videoTrack: null,
    }
    this.canPublishNow = opts.canPublish
  }

  async join(localStream: MediaStream | null): Promise<void> {
    const sessionId = this.opts.liveSessionId

    this.client = new Ably.Realtime({
      clientId: String(this.opts.user.id),
      authCallback: async (_params, callback) => {
        try {
          const res = await fetch(`/api/live/ably-token?sessionId=${sessionId}`, { cache: 'no-store' })
          if (!res.ok) throw new Error(`ably-token ${res.status}`)
          const tokenRequest = await res.json()
          callback(null, tokenRequest)
        } catch (err: any) {
          callback(err?.message ?? 'auth failed', null)
        }
      },
    })

    this.client.connection.on((stateChange) => {
      this.opts.events.onConnectionState?.(stateChange.current)
    })

    this.base = this.client.channels.get(CH.base(sessionId))
    this.chat = this.client.channels.get(CH.chat(sessionId))
    this.reactions = this.client.channels.get(CH.reactions(sessionId))
    this.hands = this.client.channels.get(CH.hands(sessionId))
    // rewind replays recent whiteboard ops so a late joiner sees the current
    // board instead of a blank one. (Beyond the rewind window, a server-side
    // snapshot is the durable fix — tracked for a later pass.)
    this.whiteboard = this.client.channels.get(CH.whiteboard(sessionId), { params: { rewind: '100' } })
    this.control = this.client.channels.get(CH.control(sessionId))

    // Everyone gets an SFU session (publishers to publish, viewers to pull).
    // Rebuild media on a terminal PeerConnection failure so a transient network
    // drop doesn't leave video/audio dead forever (Ably reconnects on its own).
    this.sfu = new SfuClient(sessionId, this.opts.iceServers, (e) => this.onRemoteTrack(e), (s) =>
      this.onMediaConnectionState(s),
    )
    await this.sfu.connect()
    // The effect may have unmounted us while connect() was in flight — bail and
    // tear down instead of leaking the SFU session + Ably connection.
    if (this.closed) {
      this.sfu.close()
      this.client.close()
      this.client = null
      return
    }

    // Publish now if the local stream is already available; otherwise
    // publishStream() is called later (from the hook) once media is granted.
    if (this.canPublishNow && localStream && localStream.getTracks().length > 0) {
      await this.doPublish(localStream)
    }

    // Sub-channel subscriptions.
    this.chat.subscribe('message', (m) => this.opts.events.onChat?.(m.data as ChatMessagePayload))
    this.reactions.subscribe('react', (m) =>
      this.opts.events.onReaction?.((m.data as any).emoji, m.clientId ?? ''),
    )
    this.control.subscribe((m) => this.opts.events.onControl?.(m.name ?? '', m.data, m.clientId ?? ''))
    this.whiteboard.subscribe((m) => this.opts.events.onWhiteboard?.(m.data, m.clientId ?? ''))

    // Presence: react to the roster, enter ourselves.
    this.base.presence.subscribe(() => this.reconcile())
    if (this.closed) return
    await this.base.presence.enter(this.local)
    this.entered = true
    await this.reconcile()
  }

  private rebuilding = false
  private rebuildAttempts = 0 // consecutive attempts since the last 'connected' (backoff)
  private rebuildTotal = 0 // session-lifetime cap so a flapping link can't churn forever

  /** Force an Ably token re-auth (e.g. whiteboard-writable was toggled → the
   *  student's capability changed and their token must be re-minted now). */
  reauth(): void {
    // ably-js re-runs the authCallback and re-applies channel capabilities.
    this.client?.auth.authorize().catch((err) => console.warn('[room] reauth failed', err))
  }

  private onMediaConnectionState(state: string): void {
    if (this.closed) return
    if (state === 'connected') this.rebuildAttempts = 0
    if (state === 'failed') void this.rebuildMedia()
  }

  /**
   * Rebuild the SFU media layer after a terminal PeerConnection failure: tear
   * down the dead PC/session, create a fresh one, re-publish our local tracks,
   * and let the next presence reconcile re-pull everyone. Ably (presence/chat)
   * is unaffected and keeps running. Bounded + backed-off so a persistently
   * broken network doesn't spin.
   */
  private async rebuildMedia(): Promise<void> {
    if (this.closed || this.rebuilding) return
    if (this.rebuildAttempts >= 4 || this.rebuildTotal >= 15) return
    this.rebuilding = true
    this.rebuildAttempts++
    this.rebuildTotal++
    try {
      await new Promise((r) => setTimeout(r, 500 * this.rebuildAttempts))
      if (this.closed) return
      const hadStream = this.published
      this.sfu?.close()
      this.published = false
      this.publishing = false
      this.pulled.clear()
      this.pullFailures.clear()
      this.sfuToUser.clear()
      this.sfu = new SfuClient(this.opts.liveSessionId, this.opts.iceServers, (e) => this.onRemoteTrack(e), (s) =>
        this.onMediaConnectionState(s),
      )
      await this.sfu.connect()
      if (this.closed) { this.sfu.close(); return }
      this.local.sfuSessionId = this.sfu.id
      this.local.audioTrack = null
      this.local.videoTrack = null
      // Re-publish our own tracks on the fresh session if we were on stage.
      if (this.canPublishNow && hadStream && this.lastStream && this.lastStream.getTracks().length > 0) {
        await this.doPublish(this.lastStream)
      }
      if (this.entered) await this.base?.presence.update(this.local).catch(() => {})
      await this.reconcile()
    } catch (err) {
      console.warn('[room] media rebuild failed', err)
    } finally {
      this.rebuilding = false
    }
  }

  /**
   * Publish the local stream to the SFU and advertise the tracks over presence.
   * Called from join() when media is ready, and later by the hook once
   * getUserMedia resolves (publishers often go live before the camera grants).
   * Idempotent.
   */
  async publishStream(stream: MediaStream): Promise<void> {
    if (this.closed || !this.canPublishNow) return
    if (!this.sfu?.id || stream.getTracks().length === 0) return
    // Already published (or a publish is in flight carrying the current tracks):
    // a device switch just swaps the outgoing media, same trackNames. Keep
    // lastStream current so a media rebuild re-publishes the LIVE stream, not the
    // ended tracks of the pre-switch one.
    if (this.published || this.publishing) {
      this.lastStream = stream
      await this.sfu.replaceTracks(stream)
      return
    }
    await this.doPublish(stream)
    if (this.entered) await this.base?.presence.update(this.local).catch(() => {})
  }

  /**
   * The host promoted this viewer to the stage: grant publish and start sending
   * the local stream. The server has already added them to stagePublishers, so
   * the RTC proxy will accept the publish.
   */
  async promoteToStage(stream: MediaStream | null): Promise<void> {
    this.canPublishNow = true
    this.local.role = 'publisher'
    if (!stream) {
      if (this.entered) await this.base?.presence.update(this.local).catch(() => {})
      return
    }
    // Retry: the server's stagePublishers write may not be readable yet when we
    // publish, which the RTC proxy 403s. Back off a few times before giving up.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await this.publishStream(stream)
        return
      } catch {
        if (this.closed || this.published) return
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
      }
    }
  }

  async demoteSelf(): Promise<void> {
    // Host took us off stage; the server already force-closed our SFU tracks.
    // Stop advertising them so peers stop pulling, and keep the SFU session for
    // viewing. A later re-promote re-publishes.
    this.canPublishNow = false
    this.local.role = 'viewer'
    this.local.audioTrack = null
    this.local.videoTrack = null
    this.published = false
    // Tear down our send transceivers so a later re-promote publishes cleanly
    // (no duplicate trackName on the same SFU session).
    await this.sfu?.unpublish().catch(() => {})
    if (this.entered) await this.base?.presence.update(this.local).catch(() => {})
  }

  private async doPublish(stream: MediaStream): Promise<void> {
    // Synchronous latch closes the double-publish window (two publishStream
    // callers racing while the first await hasn't set `published` yet).
    if (this.published || this.publishing || !this.sfu) return
    this.publishing = true
    try {
      const published = await this.sfu.publish(stream, String(this.opts.user.id))
      this.published = true
      this.lastStream = stream
      this.local.sfuSessionId = this.sfu.id
      this.local.audioTrack = published.audio ?? null
      this.local.videoTrack = published.video ?? null
    } finally {
      this.publishing = false
    }
  }

  /**
   * Rebuild the participant list from presence, pull new remote tracks, and
   * clean up departed members. Coalesced: overlapping presence bursts don't run
   * concurrent reconciles (which could apply an out-of-order roster).
   */
  private async reconcile(): Promise<void> {
    if (this.closed || !this.base) return
    if (this.reconciling) {
      this.reconcileQueued = true
      return
    }
    this.reconciling = true
    try {
      let members: Ably.PresenceMessage[] = []
      try {
        members = await this.base.presence.get()
      } catch {
        return
      }

      const list: RoomParticipant[] = members.map((m) => ({
        id: m.clientId ?? '',
        isLocal: m.clientId === String(this.opts.user.id),
        ...(m.data as PresenceData),
      }))
      this.opts.events.onParticipants?.(list)

      const presentIds = new Set(list.map((p) => p.id))

      // Drop media for anyone who left.
      for (const userId of [...this.streams.keys()]) {
        if (presentIds.has(userId)) continue
        this.streams.get(userId)?.getTracks().forEach((t) => t.stop())
        this.streams.delete(userId)
        for (const [sfuId, uid] of this.sfuToUser) if (uid === userId) this.sfuToUser.delete(sfuId)
        this.opts.events.onStreamGone?.(userId)
      }
      // Purge pulled/failure keys for absent SFU sessions.
      const presentSfu = new Set(list.filter((p) => p.sfuSessionId).map((p) => p.sfuSessionId as string))
      for (const key of [...this.pulled]) {
        const sfuId = key.split(':')[0]
        if (!presentSfu.has(sfuId)) { this.pulled.delete(key); this.pullFailures.delete(key) }
      }

      // A still-PRESENT participant who stopped advertising tracks (demoted /
      // force-closed) must have their stream + tile torn down — the leaver block
      // above only handles people who left presence entirely.
      for (const p of list) {
        if (p.isLocal) continue
        const hasTracks = Boolean(p.audioTrack || p.videoTrack)
        if (!hasTracks && this.streams.has(p.id)) {
          this.streams.get(p.id)?.getTracks().forEach((t) => t.stop())
          this.streams.delete(p.id)
          for (const [sfuId, uid] of this.sfuToUser) if (uid === p.id) this.sfuToUser.delete(sfuId)
          if (p.sfuSessionId) for (const key of [...this.pulled]) if (key.startsWith(`${p.sfuSessionId}:`)) this.pulled.delete(key)
          this.opts.events.onStreamGone?.(p.id)
        }
      }

      // Pull remote publishers' tracks we haven't pulled yet.
      for (const p of list) {
        if (p.isLocal || !p.sfuSessionId) continue
        this.sfuToUser.set(p.sfuSessionId, p.id)
        for (const trackName of [p.audioTrack, p.videoTrack]) {
          if (!trackName) continue
          const key = `${p.sfuSessionId}:${trackName}`
          if (this.pulled.has(key)) continue
          if ((this.pullFailures.get(key) ?? 0) >= 3) continue // give up after 3 tries
          this.pulled.add(key)
          this.sfu
            ?.pull(p.sfuSessionId, trackName)
            .then((track) => this.attachTrack(p.id, track))
            .catch((err) => {
              this.pulled.delete(key)
              this.pullFailures.set(key, (this.pullFailures.get(key) ?? 0) + 1)
              console.warn('[room] pull failed', p.id, trackName, err)
            })
        }
      }
    } finally {
      this.reconciling = false
      if (this.reconcileQueued) {
        this.reconcileQueued = false
        void this.reconcile()
      }
    }
  }

  private onRemoteTrack(e: { sfuSessionId: string; trackName: string; track: MediaStreamTrack }): void {
    // Safety net for a track that arrives after its pull() promise settled:
    // map the SFU session back to a participant and attach. attachTrack is
    // idempotent (dedupes by kind), so a double-attach with pull().then() is safe.
    const userId = this.sfuToUser.get(e.sfuSessionId)
    if (userId) this.attachTrack(userId, e.track)
  }

  private attachTrack(userId: string, track: MediaStreamTrack): void {
    let stream = this.streams.get(userId)
    if (!stream) {
      stream = new MediaStream()
      this.streams.set(userId, stream)
    }
    // Replace an existing track of the same kind (e.g. camera re-publish).
    stream.getTracks().filter((t) => t.kind === track.kind).forEach((t) => stream!.removeTrack(t))
    stream.addTrack(track)
    this.opts.events.onStream?.(userId, stream)
  }

  // ── outbound ──────────────────────────────────────────────────────────────
  async sendChat(msg: ChatMessagePayload): Promise<void> {
    await this.chat?.publish('message', msg)
  }
  async sendReaction(emoji: ReactionEmoji): Promise<void> {
    await this.reactions?.publish('react', { emoji })
  }
  async setHand(raised: boolean): Promise<void> {
    this.local.handRaisedAt = raised ? Date.now() : null
    await this.base?.presence.update(this.local)
    await this.hands?.publish(raised ? 'raise' : 'lower', { at: this.local.handRaisedAt })
  }
  async updateMedia(next: { micOn?: boolean; camOn?: boolean }): Promise<void> {
    this.local = { ...this.local, ...next }
    await this.base?.presence.update(this.local)
  }
  async sendControl(action: string, data: any = {}): Promise<void> {
    await this.control?.publish(action, data)
  }
  async sendWhiteboard(op: any): Promise<void> {
    await this.whiteboard?.publish('op', op)
  }

  async leave(): Promise<void> {
    if (this.closed) return
    this.closed = true
    try {
      await this.base?.presence.leave()
    } catch {
      /* ignore */
    }
    this.sfu?.close()
    this.streams.clear()
    this.pulled.clear()
    this.client?.close()
    this.client = null
  }
}

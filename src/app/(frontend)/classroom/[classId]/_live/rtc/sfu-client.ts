'use client'

// Cloudflare Realtime (SFU) client engine. One instance == one browser
// PeerConnection == one SFU session. It publishes the local stream and pulls
// remote participants' tracks. All SDP goes through our /api/live/rtc proxy
// (the app secret stays server-side). Track discovery (who published what) is
// the signalling layer's job (Ably, Phase 4) — this engine only needs a
// publisher's (sfuSessionId, trackName) to pull them.
//
// Flow references: Cloudflare Realtime SFU HTTPS API
// (POST sessions/new, POST sessions/{id}/tracks/new, PUT .../renegotiate).

import type { SessionDescription, TrackObject } from '@/lib/live/cf-realtime'

interface TracksResponse {
  requiresImmediateRenegotiation?: boolean
  sessionDescription?: SessionDescription
  tracks?: (TrackObject & { mid?: string | null; errorCode?: string; errorDescription?: string })[]
  errorCode?: string
  errorDescription?: string
}

export interface PublishedTracks {
  audio?: string
  video?: string
}

export interface RemoteTrackEvent {
  sfuSessionId: string
  trackName: string
  track: MediaStreamTrack
}

export class SfuClient {
  private pc: RTCPeerConnection | null = null
  private sfuSessionId: string | null = null
  private closed = false
  /** mid → resolver for a pending pull, so ontrack can hand the track back. */
  private pendingByMid = new Map<string, (track: MediaStreamTrack) => void>()
  /** mid → (sfuSessionId, trackName) so we can label incoming tracks. */
  private midMeta = new Map<string, { sfuSessionId: string; trackName: string }>()
  /** local track objects we published, so we can close them on teardown. */
  private localTrackObjects: TrackObject[] = []
  /** kind → the send RTCRtpSender, so we can replace/null its track on toggle. */
  private sendersByKind = new Map<'audio' | 'video', RTCRtpSender>()
  /** the authenticated publisher id, retained so a later add-track keeps naming. */
  private publisherId = ''
  private pullTimers = new Set<ReturnType<typeof setTimeout>>()
  /**
   * Serialize ALL SDP mutations. Concurrent publish()/pull() on one PC would
   * otherwise interleave setLocalDescription/setRemoteDescription/createAnswer
   * and corrupt negotiation (glare → InvalidStateError / dropped tracks).
   */
  private chain: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly liveSessionId: string | number,
    private readonly iceServers: RTCIceServer[],
    private readonly onRemoteTrack?: (e: RemoteTrackEvent) => void,
    private readonly onConnectionState?: (state: RTCPeerConnectionState) => void,
  ) {}

  get id(): string | null {
    return this.sfuSessionId
  }

  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn)
    this.chain = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  private async rpc(body: Record<string, unknown>): Promise<TracksResponse & { sessionId?: string }> {
    const res = await fetch('/api/live/rtc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.liveSessionId, sfuSessionId: this.sfuSessionId, ...body }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || `RTC ${body.action} failed (${res.status})`)
    return json
  }

  /** Create the PeerConnection + SFU session. */
  async connect(): Promise<void> {
    if (this.pc) return
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      bundlePolicy: 'max-bundle',
    })
    this.pc = pc

    // Surface PeerConnection health. A transient blip → try an in-place ICE
    // restart; a terminal 'failed' is reported so the room can rebuild the whole
    // media session (Ably/presence keep running independently).
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'disconnected') {
        // Give ICE a chance to recover on its own before forcing anything.
        pc.restartIce?.()
      }
      this.onConnectionState?.(state)
    }

    pc.ontrack = (ev) => {
      const mid = ev.transceiver?.mid ?? null
      if (mid && this.pendingByMid.has(mid)) {
        this.pendingByMid.get(mid)!(ev.track)
        this.pendingByMid.delete(mid)
      } else if (mid && this.midMeta.has(mid)) {
        const meta = this.midMeta.get(mid)!
        this.onRemoteTrack?.({ ...meta, track: ev.track })
      } else {
        // Silent drops are the top "can't see others" symptom — make them visible.
        console.warn('[sfu] ontrack for unmatched mid', mid)
      }
    }

    const created = await this.rpc({ action: 'session' })
    if (!created.sessionId) throw new Error('SFU session not created')
    this.sfuSessionId = created.sessionId
  }

  /**
   * Publish the local stream's tracks. Returns the trackNames Cloudflare
   * assigned, which the caller advertises over signalling so peers can pull them.
   *
   * CONTRACT: `publisherUserId` MUST be the authenticated user's id. The server
   * closes `${userId}-audio|video` on leave/end (forceCloseParticipantTracks),
   * so any other prefix silently defeats the server-side media-leak teardown.
   */
  async publish(stream: MediaStream, publisherUserId: string): Promise<PublishedTracks> {
    return this.serialize(async () => {
      const pc = this.requirePc()
      this.publisherId = publisherUserId
      const published: PublishedTracks = {}
      const localTracks: TrackObject[] = []

      for (const track of stream.getTracks()) {
        const transceiver = pc.addTransceiver(track, { direction: 'sendonly' })
        const trackName = `${publisherUserId}-${track.kind}`
        this.sendersByKind.set(track.kind as 'audio' | 'video', transceiver.sender)
        localTracks.push({ location: 'local', mid: transceiver.mid, trackName })
        if (track.kind === 'audio') published.audio = trackName
        else published.video = trackName
      }
      if (localTracks.length === 0) return published

      await pc.setLocalDescription(await pc.createOffer())
      const res = await this.rpc({
        action: 'tracks',
        sessionDescription: { type: 'offer', sdp: pc.localDescription!.sdp },
        tracks: localTracks,
      })
      if (res.sessionDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(res.sessionDescription))
      }
      this.localTrackObjects.push(...localTracks)
      return published
    })
  }

  /**
   * Reconcile the outgoing tracks to match `stream`, per kind:
   *  - track present + sender exists  → replaceTrack (device switch / cam resume);
   *    trackName stays valid, peers keep pulling, no renegotiation.
   *  - track present + no sender yet   → addTransceiver + renegotiate (e.g. joined
   *    with the camera off, then turned it on); returns the new trackName so the
   *    caller can advertise it over presence.
   *  - track ABSENT + sender exists    → replaceTrack(null) (camera released/off);
   *    keeps the sender + trackName so a later resume just replaces the track again.
   * Returns the full set of published trackNames (existing + any newly added).
   */
  async syncTracks(stream: MediaStream): Promise<PublishedTracks> {
    return this.serialize(async () => {
      const pc = this.requirePc()
      const published: PublishedTracks = {}
      for (const t of this.localTrackObjects) {
        if (t.trackName?.endsWith('-audio')) published.audio = t.trackName
        else if (t.trackName?.endsWith('-video')) published.video = t.trackName
      }

      const added: TrackObject[] = []
      for (const kind of ['audio', 'video'] as const) {
        const track = stream.getTracks().find((t) => t.kind === kind) ?? null
        const sender = this.sendersByKind.get(kind)
        if (track) {
          if (sender) {
            await sender.replaceTrack(track)
          } else {
            const transceiver = pc.addTransceiver(track, { direction: 'sendonly' })
            const trackName = `${this.publisherId}-${kind}`
            this.sendersByKind.set(kind, transceiver.sender)
            added.push({ location: 'local', mid: transceiver.mid, trackName })
            published[kind] = trackName
          }
        } else if (sender) {
          await sender.replaceTrack(null)
        }
      }

      if (added.length > 0) {
        await pc.setLocalDescription(await pc.createOffer())
        const res = await this.rpc({
          action: 'tracks',
          sessionDescription: { type: 'offer', sdp: pc.localDescription!.sdp },
          tracks: added,
        })
        if (res.sessionDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(res.sessionDescription))
        }
        this.localTrackObjects.push(...added)
      }
      return published
    })
  }

  /**
   * Pull one remote track (by publisher session + trackName). Resolves with the
   * live MediaStreamTrack once it arrives on the PeerConnection.
   */
  async pull(remoteSfuSessionId: string, trackName: string): Promise<MediaStreamTrack> {
    return this.serialize(async () => {
      const pc = this.requirePc()
      const res = await this.rpc({
        action: 'tracks',
        tracks: [{ location: 'remote', sessionId: remoteSfuSessionId, trackName }],
      })

      const returned = res.tracks?.[0]
      if (returned?.errorCode) throw new Error(returned.errorDescription || returned.errorCode)
      const mid = returned?.mid ?? null
      if (!mid) throw new Error('SFU did not return a mid for the pulled track')

      const trackPromise = new Promise<MediaStreamTrack>((resolve, reject) => {
        this.midMeta.set(mid, { sfuSessionId: remoteSfuSessionId, trackName })
        this.pendingByMid.set(mid, resolve)
        const timer = setTimeout(() => {
          this.pullTimers.delete(timer)
          if (this.pendingByMid.has(mid)) {
            this.pendingByMid.delete(mid)
            reject(new Error('Timed out waiting for remote track'))
          }
        }, 15000)
        this.pullTimers.add(timer)
      })

      // Whenever the SFU returns an offer (a new remote track was added), answer
      // it — `requiresImmediateRenegotiation` is advisory, so gate on the offer.
      if (res.sessionDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(res.sessionDescription))
        await pc.setLocalDescription(await pc.createAnswer())
        await this.rpc({
          action: 'renegotiate',
          sessionDescription: { type: 'answer', sdp: pc.localDescription!.sdp },
        })
      }

      return trackPromise
    })
  }

  /**
   * Stop publishing our local tracks (taken off stage). Closes them on the SFU
   * and removes the send senders so a later re-publish adds fresh transceivers
   * instead of reusing a trackName the session still holds.
   */
  async unpublish(): Promise<void> {
    const tracks = this.localTrackObjects.map((t) => ({ mid: t.mid, trackName: t.trackName }))
    if (tracks.length) await this.rpc({ action: 'close', tracks }).catch(() => {})
    return this.serialize(async () => {
      const pc = this.pc
      if (!pc) return
      for (const sender of pc.getSenders()) {
        sender.track?.stop()
        try {
          pc.removeTrack(sender)
        } catch {
          /* ignore */
        }
      }
      this.localTrackObjects = []
      this.sendersByKind.clear()
    })
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    for (const t of this.pullTimers) clearTimeout(t)
    this.pullTimers.clear()
    this.pendingByMid.clear()
    this.midMeta.clear()

    // Best-effort: tell the SFU to close our published tracks so they don't keep
    // being forwarded (and, once billing is SFU-aware, keep accruing) after we
    // leave. sendBeacon survives page unload.
    if (this.sfuSessionId && this.localTrackObjects.length > 0) {
      try {
        const payload = JSON.stringify({
          action: 'close',
          sessionId: this.liveSessionId,
          sfuSessionId: this.sfuSessionId,
          tracks: this.localTrackObjects.map((t) => ({ mid: t.mid, trackName: t.trackName })),
        })
        navigator.sendBeacon?.('/api/live/rtc', new Blob([payload], { type: 'application/json' }))
      } catch {
        /* ignore */
      }
    }

    try {
      this.pc?.getSenders().forEach((s) => s.track?.stop())
      this.pc?.close()
    } catch {
      /* ignore */
    }
    this.pc = null
  }

  private requirePc(): RTCPeerConnection {
    if (!this.pc || !this.sfuSessionId) throw new Error('SfuClient not connected — call connect() first')
    return this.pc
  }
}

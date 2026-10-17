import type { SignalData } from '@/lib/live/socket-types'

// Direct peer-to-peer media: a full mesh of RTCPeerConnections using the WHATWG
// "perfect negotiation" pattern. This REPLACES the Cloudflare SFU — each browser
// connects straight to every other participant, so media never routes through a
// hub. Signalling (offer/answer/ICE) is transport-agnostic: this class only asks
// its owner to relay a SignalData blob to a peer (we do that over Socket.IO).
//
// Ported from the tutor-meet reference implementation. Peers are keyed by app
// user id (one connection per user; the server evicts stale sockets), so the
// politeness role is deterministic and symmetric.

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

function buildConfig(iceServers: RTCIceServer[]): RTCConfiguration {
  return {
    iceServers: iceServers.length ? iceServers : DEFAULT_ICE_SERVERS,
    iceCandidatePoolSize: 4,
    // Force audio + video onto ONE ICE transport. Without this the video section
    // can negotiate its own transport that fails on real NATs while audio's
    // succeeds — the "I can hear them but can't see them" bug that only shows up
    // across networks (on one machine everything trivially connects).
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  }
}

interface PeerHandlers {
  sendSignal: (to: string, data: SignalData) => void
  onTrack: (peerId: string, kind: 'camera' | 'screen', stream: MediaStream) => void
  onState: (peerId: string, state: RTCPeerConnectionState) => void
}

interface PeerEntry {
  pc: RTCPeerConnection
  /** Perfect-negotiation role: the polite peer yields on an offer collision. */
  polite: boolean
  makingOffer: boolean
  ignoreOffer: boolean
  pendingCandidates: RTCIceCandidateInit[]
  /** Senders kept so we can hot-swap outgoing tracks without renegotiating. */
  audioTransceiver: RTCRtpTransceiver | null
  cameraTransceiver: RTCRtpTransceiver | null
  screenTransceiver: RTCRtpTransceiver | null
  mediaAttached: boolean
  /** Pending grace timer before forcing an ICE restart on a transient drop. */
  iceRestartTimer: ReturnType<typeof setTimeout> | null
}

export class PeerManager {
  private peers = new Map<string, PeerEntry>()
  private localStream: MediaStream
  private screenStream: MediaStream
  private handlers: PeerHandlers
  private selfId: string
  private config: RTCConfiguration
  /** Latest outgoing tracks, applied to peers created later. */
  private currentCameraTrack: MediaStreamTrack | null
  private currentScreenTrack: MediaStreamTrack | null
  private currentAudioTrack: MediaStreamTrack | null
  private destroyed = false

  constructor(
    selfId: string,
    localStream: MediaStream,
    screenStream: MediaStream = new MediaStream(),
    handlers: PeerHandlers,
    iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS,
  ) {
    this.selfId = selfId
    this.localStream = localStream
    this.screenStream = screenStream
    this.handlers = handlers
    this.config = buildConfig(iceServers)
    this.currentCameraTrack = localStream.getVideoTracks()[0] ?? null
    this.currentScreenTrack = screenStream.getVideoTracks()[0] ?? null
    this.currentAudioTrack = localStream.getAudioTracks()[0] ?? null
  }

  /** Peers we currently hold a connection to (for roster-driven diffing). */
  peerIds(): string[] {
    return [...this.peers.keys()]
  }

  /**
   * Ensure a connection to `peerId` exists and is negotiating. Safe to call from
   * both sides (existing peers on join, and on a later peer-joined) — politeness
   * sorts out the resulting offer collision.
   */
  connect(peerId: string): void {
    if (peerId === this.selfId) return
    this.ensurePeer(peerId)
  }

  private ensurePeer(peerId: string): PeerEntry {
    const existing = this.peers.get(peerId)
    if (existing) return existing

    const pc = new RTCPeerConnection(this.config)
    // Deterministic, symmetric role: exactly one side is polite.
    const polite = this.selfId < peerId
    const entry: PeerEntry = {
      pc,
      polite,
      makingOffer: false,
      ignoreOffer: false,
      pendingCandidates: [],
      audioTransceiver: null,
      cameraTransceiver: null,
      screenTransceiver: null,
      mediaAttached: false,
      iceRestartTimer: null,
    }
    this.peers.set(peerId, entry)

    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true
        await pc.setLocalDescription()
        if (pc.localDescription) {
          this.handlers.sendSignal(peerId, { type: 'offer', sdp: pc.localDescription.toJSON() })
        }
      } catch (err) {
        console.error('[webrtc] negotiation failed', err)
      } finally {
        entry.makingOffer = false
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.handlers.sendSignal(peerId, { type: 'candidate', candidate: e.candidate.toJSON() })
      }
    }

    pc.ontrack = (e) => {
      // A reserved transceiver can arrive without an msid while its sender has
      // no track (screen sharing normally starts later). Keep its receiver track
      // in a synthetic stream so replaceTrack begins rendering immediately when
      // the remote participant starts sharing, without another negotiation.
      const stream = e.streams[0] ?? new MediaStream([e.track])
      const kind =
        e.transceiver === entry.screenTransceiver ? 'screen' : 'camera'
      this.handlers.onTrack(peerId, kind, stream)
    }

    pc.oniceconnectionstatechange = () => {
      // A dropped/blocked media path lands here. restartIce() re-triggers
      // onnegotiationneeded → a fresh offer with new ICE, which actually recovers
      // the connection.
      const state = pc.iceConnectionState
      if (state === 'failed') {
        console.warn(`[webrtc] ICE failed for ${peerId} — restarting ICE`)
        try {
          pc.restartIce()
        } catch {
          /* not fatal */
        }
      } else if (state === 'disconnected') {
        // A transient drop (network blip) often heals on its own; give it a few
        // seconds, then force an ICE restart to actively reconnect the media.
        if (entry.iceRestartTimer) clearTimeout(entry.iceRestartTimer)
        entry.iceRestartTimer = setTimeout(() => {
          entry.iceRestartTimer = null
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            try {
              pc.restartIce()
            } catch {
              /* not fatal */
            }
          }
        }, 4000)
      } else if (state === 'connected' || state === 'completed') {
        if (entry.iceRestartTimer) {
          clearTimeout(entry.iceRestartTimer)
          entry.iceRestartTimer = null
        }
      }
    }

    pc.onconnectionstatechange = () => {
      this.handlers.onState(peerId, pc.connectionState)
    }

    this.attachLocalMedia(entry)
    return entry
  }

  /**
   * Attach media to a connection exactly once. Camera and screen use separate
   * sendrecv video m-lines so sharing never replaces the presenter's face.
   */
  private attachLocalMedia(entry: PeerEntry): void {
    if (entry.mediaAttached) return
    entry.mediaAttached = true
    const pc = entry.pc

    entry.audioTransceiver = pc.addTransceiver(this.currentAudioTrack ?? 'audio', {
      direction: 'sendrecv',
      streams: [this.localStream],
    })
    entry.cameraTransceiver = pc.addTransceiver(this.currentCameraTrack ?? 'video', {
      direction: 'sendrecv',
      streams: [this.localStream],
    })
    entry.screenTransceiver = pc.addTransceiver(this.currentScreenTrack ?? 'video', {
      direction: 'sendrecv',
      streams: [this.screenStream],
    })
  }

  async handleSignal(from: string, data: SignalData): Promise<void> {
    if (this.destroyed) return
    const entry = this.ensurePeer(from)
    const pc = entry.pc

    try {
      if (data.type === 'offer' || data.type === 'answer') {
        const collision =
          data.type === 'offer' && (entry.makingOffer || pc.signalingState !== 'stable')
        entry.ignoreOffer = !entry.polite && collision
        if (entry.ignoreOffer) return // impolite peer keeps its own offer

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
        await this.flushCandidates(entry)

        if (data.type === 'offer') {
          await pc.setLocalDescription() // implicit answer
          if (pc.localDescription) {
            this.handlers.sendSignal(from, { type: 'answer', sdp: pc.localDescription.toJSON() })
          }
        }
      } else if (data.type === 'candidate') {
        // Candidates that arrive before the remote description can't be added
        // yet — buffer and flush once setRemoteDescription lands.
        if (!pc.remoteDescription) {
          entry.pendingCandidates.push(data.candidate)
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
          } catch (err) {
            if (!entry.ignoreOffer) console.error('addIceCandidate failed', err)
          }
        }
      }
    } catch (err) {
      console.error('handleSignal failed', err)
    }
  }

  private async flushCandidates(entry: PeerEntry): Promise<void> {
    for (const c of entry.pendingCandidates.splice(0)) {
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(c))
      } catch (err) {
        console.error('addIceCandidate (flush) failed', err)
      }
    }
  }

  /**
   * Swap the outgoing camera on every peer, or pass null when it is off.
   */
  replaceCameraTrack(track: MediaStreamTrack | null): void {
    this.currentCameraTrack = track
    for (const entry of this.peers.values()) {
      entry.cameraTransceiver?.sender.replaceTrack(track).catch((err) => {
        console.error('replaceTrack (camera) failed', err)
      })
    }
  }

  /** Publish or stop the independent display-capture track. */
  replaceScreenTrack(track: MediaStreamTrack | null, stream?: MediaStream): void {
    this.currentScreenTrack = track
    if (stream) this.screenStream = stream
    for (const entry of this.peers.values()) {
      entry.screenTransceiver?.sender.replaceTrack(track).catch((err) => {
        console.error('replaceTrack (screen) failed', err)
      })
    }
  }

  /** Swap the outgoing audio on every peer (mic device change / mute-off). */
  replaceAudioTrack(track: MediaStreamTrack | null): void {
    this.currentAudioTrack = track
    for (const entry of this.peers.values()) {
      entry.audioTransceiver?.sender.replaceTrack(track).catch((err) => {
        console.error('replaceTrack (audio) failed', err)
      })
    }
  }

  disconnect(peerId: string): void {
    const entry = this.peers.get(peerId)
    if (!entry) return
    if (entry.iceRestartTimer) clearTimeout(entry.iceRestartTimer)
    entry.pc.onnegotiationneeded = null
    entry.pc.close()
    this.peers.delete(peerId)
  }

  destroy(): void {
    this.destroyed = true
    for (const entry of this.peers.values()) {
      if (entry.iceRestartTimer) clearTimeout(entry.iceRestartTimer)
      entry.pc.onnegotiationneeded = null
      entry.pc.close()
    }
    this.peers.clear()
  }
}

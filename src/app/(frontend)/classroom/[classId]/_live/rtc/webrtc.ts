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
  onTrack: (peerId: string, stream: MediaStream) => void
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
  audioSender: RTCRtpSender | null
  videoSender: RTCRtpSender | null
  mediaAttached: boolean
}

export class PeerManager {
  private peers = new Map<string, PeerEntry>()
  private localStream: MediaStream
  private handlers: PeerHandlers
  private selfId: string
  private config: RTCConfiguration
  /** Latest outgoing tracks, applied to peers created later. */
  private currentVideoTrack: MediaStreamTrack | null
  private currentAudioTrack: MediaStreamTrack | null
  private destroyed = false

  constructor(
    selfId: string,
    localStream: MediaStream,
    handlers: PeerHandlers,
    iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS,
  ) {
    this.selfId = selfId
    this.localStream = localStream
    this.handlers = handlers
    this.config = buildConfig(iceServers)
    this.currentVideoTrack = localStream.getVideoTracks()[0] ?? null
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
      audioSender: null,
      videoSender: null,
      mediaAttached: false,
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
      if (e.streams[0]) this.handlers.onTrack(peerId, e.streams[0])
    }

    pc.oniceconnectionstatechange = () => {
      // A dropped/blocked media path lands here. restartIce() re-triggers
      // onnegotiationneeded → a fresh offer with new ICE, which actually recovers
      // the connection.
      if (pc.iceConnectionState === 'failed') {
        console.warn(`[webrtc] ICE failed for ${peerId} — restarting ICE`)
        try {
          pc.restartIce()
        } catch {
          /* not fatal */
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
   * Attach our audio + video to a connection exactly once. We always reserve one
   * sendrecv audio m-line and one sendrecv video m-line (even when a track is
   * currently missing — mic muted-off, camera off, or an observer/parent with no
   * media) so every toggle afterwards is a zero-renegotiation `replaceTrack`.
   */
  private attachLocalMedia(entry: PeerEntry): void {
    if (entry.mediaAttached) return
    entry.mediaAttached = true
    const pc = entry.pc

    if (this.currentAudioTrack) {
      entry.audioSender = pc.addTrack(this.currentAudioTrack, this.localStream)
    } else {
      entry.audioSender = pc.addTransceiver('audio', {
        direction: 'sendrecv',
        streams: [this.localStream],
      }).sender
    }

    if (this.currentVideoTrack) {
      entry.videoSender = pc.addTrack(this.currentVideoTrack, this.localStream)
    } else {
      entry.videoSender = pc.addTransceiver('video', {
        direction: 'sendrecv',
        streams: [this.localStream],
      }).sender
    }
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
   * Swap the outgoing video on every peer. Pass a track for camera/screen-share,
   * or `null` to blank it (camera off / device released / observer). Uses the
   * stored video sender so it keeps working after the track has been set to null.
   */
  replaceVideoTrack(track: MediaStreamTrack | null): void {
    this.currentVideoTrack = track
    for (const entry of this.peers.values()) {
      entry.videoSender?.replaceTrack(track).catch((err) => {
        console.error('replaceTrack (video) failed', err)
      })
    }
  }

  /** Swap the outgoing audio on every peer (mic device change / mute-off). */
  replaceAudioTrack(track: MediaStreamTrack | null): void {
    this.currentAudioTrack = track
    for (const entry of this.peers.values()) {
      entry.audioSender?.replaceTrack(track).catch((err) => {
        console.error('replaceTrack (audio) failed', err)
      })
    }
  }

  disconnect(peerId: string): void {
    const entry = this.peers.get(peerId)
    if (!entry) return
    entry.pc.onnegotiationneeded = null
    entry.pc.close()
    this.peers.delete(peerId)
  }

  destroy(): void {
    this.destroyed = true
    for (const { pc } of this.peers.values()) {
      pc.onnegotiationneeded = null
      pc.close()
    }
    this.peers.clear()
  }
}

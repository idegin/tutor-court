// Shared wire contract for the live-classroom realtime plane. Imported by BOTH
// the browser client (rtc/realtime-room.ts) and the custom Socket.IO server
// (server.ts at the repo root), so it must stay dependency-free — plain types
// only, no runtime imports.
//
// This is the Socket.IO replacement for what used to be Ably channels + the
// Cloudflare SFU. Presence/chat/reactions/control/whiteboard ride these events;
// media flows peer-to-peer (the `signal` event only relays WebRTC SDP/ICE).

export type AccountType = 'tutor' | 'student' | 'parent'
export type Role = 'host' | 'publisher' | 'viewer'

/** WebRTC signaling payload relayed verbatim between two peers. */
export type SignalData =
  | { type: 'offer' | 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'candidate'; candidate: RTCIceCandidateInit }

/** Public presence state for a participant in the room. */
export interface PresenceData {
  name: string
  accountType: AccountType
  role: Role
  micOn: boolean
  camOn: boolean
  handRaisedAt?: number | null
}

export interface RoomParticipant extends PresenceData {
  id: string // app user id
  isLocal: boolean
}

export interface ChatMessagePayload {
  id: string
  senderId: string
  senderName: string
  senderAccountType: AccountType
  body: string
  sentAt: number
}

/** Anything the whiteboard channel carries (op/show/active/writable/create). */
export type WhiteboardMessage = Record<string, any>

/** Claims embedded in the signed socket token minted by /api/live/socket-token. */
export interface SocketTokenClaims {
  sub: string // user id
  sid: string // live-session id (normalized)
  name: string
  accountType: AccountType
  role: Role
  canPublish: boolean
  isHost: boolean
  whiteboardWritable: boolean
  exp: number // unix seconds
}

// ---- Socket.IO event maps (typed both ends) ----

export interface ClientToServerEvents {
  join: (data: { token: string }) => void
  signal: (data: { to: string; data: SignalData }) => void
  presence: (data: Partial<PresenceData>) => void
  chat: (data: ChatMessagePayload) => void
  reaction: (data: { emoji: string }) => void
  control: (data: { action: string; data?: any }) => void
  whiteboard: (data: { op: WhiteboardMessage }) => void
}

export interface ServerToClientEvents {
  joined: (data: {
    self: RoomParticipant
    peers: RoomParticipant[]
    chat: ChatMessagePayload[]
    whiteboard: WhiteboardMessage[]
    whiteboardWritable: boolean
  }) => void
  roster: (participants: RoomParticipant[]) => void
  signal: (data: { from: string; data: SignalData }) => void
  chat: (message: ChatMessagePayload) => void
  reaction: (data: { emoji: string; from: string }) => void
  control: (data: { action: string; data: any; from: string }) => void
  whiteboard: (data: { op: WhiteboardMessage; from: string }) => void
  kicked: (data: { reason?: string }) => void
  denied: (data: { message: string }) => void
}

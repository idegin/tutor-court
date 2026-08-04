// Shared types for the live-classroom v2 UI. This is the UI-first pass: all data
// is mocked (see mock-data.ts) and the flow is driven client-side. When the
// Cloudflare Realtime + Ably backend lands, these types stay; only the data
// source behind them changes.

export type Role = 'host' | 'publisher' | 'viewer'
export type AccountType = 'tutor' | 'student' | 'parent'

/** The screen the local user is currently on. */
export type Phase = 'lobby' | 'waiting' | 'live' | 'ended'

export interface Participant {
  id: string
  name: string
  accountType: AccountType
  role: Role
  avatar?: string | null
  /** Local media intent — before/after join these mirror the device toggles. */
  micOn: boolean
  camOn: boolean
  handRaisedAt?: number | null
  /** Purely presentational: drives the "speaking" ring in the mock. */
  speaking?: boolean
  isLocal?: boolean
  /** Present for tutor/host so the credit meter has an owner. */
  connection?: 'good' | 'weak'
}

export type ReactionEmoji = '👍' | '❤️' | '😂' | '🎉' | '👏' | '🔥' | '😮' | '🙌'

export interface ChatReaction {
  emoji: ReactionEmoji
  by: string // participant id
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderAccountType: AccountType
  senderAvatar?: string | null
  body: string
  sentAt: number
  reactions: ChatReaction[]
  system?: boolean
}

export interface Whiteboard {
  id: string
  title: string
  /** Deterministic hue used to render the mock board's accent. */
  hue: number
  createdBy: string
}

export interface LiveSession {
  id: string
  roomId: string
  classTitle: string
  subject: string
  classType: 'one-on-one' | 'group'
  tutorName: string
  /** Live status mirrors the Payload `live-sessions.status` field. */
  status: 'waiting' | 'live' | 'ended'
  whiteboardVisible: boolean
  whiteboardWritable: boolean
  activeWhiteboardId: string | null
}

/** Tutor-only wallet snapshot for the live credit meter. */
export interface CreditState {
  /** Credits remaining right now. */
  balance: number
  /** Credits spent so far this session. */
  consumed: number
  /** Per-minute burn rate used to project time-remaining. */
  burnPerMinute: number
  /** Below this, the low-credit alert fires (tutor only). */
  lowThreshold: number
}

/** Which side panel (if any) is open in the live room. */
export type PanelKind = 'chat' | 'people' | 'boards' | null

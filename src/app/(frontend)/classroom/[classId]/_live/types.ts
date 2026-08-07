// Shared types for the live-classroom v2 UI. The room runs on real data: the
// server (page.tsx) resolves the class + live session and hands the client a
// ClassroomBootstrap; the client fills chat/presence/whiteboard from Ably and
// media from the Cloudflare Realtime SFU. There is no mock/demo data path.

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

export interface WBStroke {
  d: string
  color: string
}

export interface Whiteboard {
  id: string
  title: string
  /** Deterministic hue used to render the board's accent. */
  hue: number
  createdBy: string
  /** Persisted stroke snapshot (from the DB) so a (re)joiner renders the board
   *  immediately, before live Ably ops arrive. */
  snapshot?: WBStroke[]
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

/** The authenticated user's identity + publish rights for the live room. */
export interface Identity {
  id: string
  name: string
  accountType: AccountType
  role: Role
  /** Tutor + enrolled students publish media; parents observe only. */
  canPublish: boolean
}

/**
 * Everything the server resolves before the client renders the room. This is the
 * single source of truth handed to <ClassroomExperience/> — it replaces the old
 * mock state. `session` carries display metadata sourced from the CLASS (always
 * present); `liveSessionId` is non-null only once the tutor has actually started.
 */
export interface ClassroomBootstrap {
  /** The live-classroom backend (SFU + Ably) is configured. */
  ready: boolean
  role: 'tutor' | 'student'
  classId: string
  identity: Identity | null
  /** Room display metadata (title/subject/tutor) from the class. */
  session: LiveSession
  /** The active live-session id, or null when the tutor hasn't started yet. */
  liveSessionId: string | number | null
  /** ISO start time of the live session, to seed the elapsed clock; null if not started. */
  startedAt: string | null
  /** Tutor wallet balance for the credit meter; null for students/parents. */
  creditBalance: number | null
  boards: Whiteboard[]
}

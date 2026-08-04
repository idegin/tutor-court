// Mock data + scenario helpers for the UI-first live classroom. Everything here
// is disposable: it exists so the full user flow (lobby → waiting → live → ended)
// can be designed and demoed without the media/realtime backend. The `as`
// argument lets you preview both the tutor and student experiences.

import type {
  ChatMessage,
  CreditState,
  LiveSession,
  Participant,
  Whiteboard,
} from './types'
import { resolveAvatar } from './avatar'

const now = () => 1_722_700_000_000 // fixed base so SSR/CSR agree; offsets below

export const MOCK_SESSION: LiveSession = {
  id: 'sess_mock_01',
  roomId: 'algebra-ii-thu-1600',
  classTitle: 'Algebra II — Quadratics & Parabolas',
  subject: 'Mathematics',
  classType: 'group',
  tutorName: 'Chukwuemeka Ifeora',
  status: 'live',
  whiteboardVisible: false,
  whiteboardWritable: false,
  activeWhiteboardId: 'wb_1',
}

const TUTOR: Participant = {
  id: 'u_tutor',
  name: 'Chukwuemeka Ifeora',
  accountType: 'tutor',
  role: 'host',
  avatar: null,
  micOn: true,
  camOn: true,
  speaking: true,
  connection: 'good',
}

const STUDENTS: Participant[] = [
  { id: 'u_amara', name: 'Amara Okafor', micOn: true, camOn: true, speaking: false },
  { id: 'u_daniel', name: 'Daniel Boateng', micOn: false, camOn: true, speaking: false },
  { id: 'u_zainab', name: 'Zainab Bello', micOn: true, camOn: false, speaking: false },
  { id: 'u_liam', name: 'Liam Chen', micOn: false, camOn: false, speaking: false, handRaisedAt: now() - 40_000 },
  { id: 'u_fatima', name: 'Fatima Sani', micOn: false, camOn: true, speaking: false },
  { id: 'u_noah', name: 'Noah Adeyemi', micOn: true, camOn: true, speaking: false },
  { id: 'u_grace', name: 'Grace Umeh', micOn: false, camOn: false, speaking: false },
].map((s) => ({
  ...s,
  accountType: 'student' as const,
  role: 'viewer' as const,
  avatar: null,
}))

export const MOCK_WHITEBOARDS: Whiteboard[] = [
  { id: 'wb_1', title: 'Warm-up: factoring', hue: 152, createdBy: 'u_tutor' },
  { id: 'wb_2', title: 'Parabola sketch', hue: 262, createdBy: 'u_tutor' },
]

export const MOCK_CREDIT: CreditState = {
  balance: 148,
  consumed: 52,
  burnPerMinute: 4,
  lowThreshold: 40,
}

export function mockChat(): ChatMessage[] {
  const base = now()
  const msg = (
    id: string,
    who: Participant,
    body: string,
    ago: number,
    reactions: ChatMessage['reactions'] = [],
  ): ChatMessage => ({
    id,
    senderId: who.id,
    senderName: who.name,
    senderAccountType: who.accountType,
    senderAvatar: who.avatar,
    body,
    sentAt: base - ago,
    reactions,
  })
  return [
    {
      id: 'm_sys',
      senderId: 'system',
      senderName: 'Tutor Court',
      senderAccountType: 'tutor',
      body: 'Welcome to Algebra II. Please keep mics muted until called on.',
      sentAt: base - 600_000,
      reactions: [],
      system: true,
    },
    msg('m1', TUTOR, "Today we're finishing quadratics. Grab a pen and paper 📐", 540_000, [
      { emoji: '👍', by: 'u_amara' },
      { emoji: '🔥', by: 'u_noah' },
      { emoji: '👍', by: 'u_daniel' },
    ]),
    msg('m2', STUDENTS[0], 'Ready! Last week made so much more sense after the recap.', 480_000, [
      { emoji: '❤️', by: 'u_tutor' },
    ]),
    msg('m3', STUDENTS[3], "Quick q — is the vertex always the minimum?", 120_000),
    msg('m4', TUTOR, 'Great question Liam — only when the parabola opens upward. Raise your hand and unmute 🙌', 90_000, [
      { emoji: '🙌', by: 'u_liam' },
      { emoji: '👏', by: 'u_fatima' },
    ]),
  ]
}

export interface MockState {
  session: LiveSession
  localUser: Participant
  remote: Participant[]
  chat: ChatMessage[]
  whiteboards: Whiteboard[]
  credit: CreditState
}

/**
 * Build the initial client state for a given viewer role.
 * - `tutor`  → local user is the host; the room is already live with students.
 * - `student`→ local user is a viewer; used to preview the waiting-room + live view.
 */
export function buildMockState(as: 'tutor' | 'student'): MockState {
  if (as === 'tutor') {
    return {
      session: { ...MOCK_SESSION },
      localUser: { ...TUTOR, isLocal: true },
      remote: STUDENTS.map((s) => ({ ...s })),
      chat: mockChat(),
      whiteboards: [...MOCK_WHITEBOARDS],
      credit: { ...MOCK_CREDIT },
    }
  }

  // Student preview: local user is one of the class, tutor + peers are remote.
  const localStudent: Participant = {
    id: 'u_amara',
    name: 'Amara Okafor',
    accountType: 'student',
    role: 'viewer',
    avatar: null,
    micOn: true,
    camOn: true,
    isLocal: true,
  }
  return {
    session: { ...MOCK_SESSION },
    localUser: localStudent,
    remote: [{ ...TUTOR }, ...STUDENTS.filter((s) => s.id !== 'u_amara').map((s) => ({ ...s }))],
    chat: mockChat(),
    whiteboards: [...MOCK_WHITEBOARDS],
    credit: { ...MOCK_CREDIT }, // students never see this; kept for shape parity
  }
}

/** Attach resolved avatar URLs (mutates a copy) — call once on the client. */
export function withAvatars(list: Participant[]): Participant[] {
  return list.map((p) => ({ ...p, avatar: resolveAvatar(p.name, p.avatar) }))
}

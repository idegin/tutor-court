// Builds the client's initial room state from the server-resolved bootstrap.
// Real data only — the roster, chat and whiteboard start EMPTY and fill from
// Ably presence/messages once the room connects. (Replaces the old mock-data.)

import { CREDIT_RATE } from '@/lib/constants'
import type {
  ChatMessage,
  CreditState,
  ClassroomBootstrap,
  LiveSession,
  Participant,
  Whiteboard,
} from './types'

export interface InitialState {
  session: LiveSession
  localUser: Participant
  remote: Participant[]
  chat: ChatMessage[]
  whiteboards: Whiteboard[]
  credit: CreditState
}

/** Below this credit balance the low-credit alert fires (tutor only). */
const LOW_CREDIT_THRESHOLD = 40

export function buildInitialState(bootstrap: ClassroomBootstrap): InitialState {
  const id = bootstrap.identity
  const localUser: Participant = {
    id: id?.id ?? 'me',
    name: id?.name ?? 'You',
    accountType: id?.accountType ?? (bootstrap.role === 'tutor' ? 'tutor' : 'student'),
    role: id?.role ?? (bootstrap.role === 'tutor' ? 'host' : 'viewer'),
    avatar: null,
    // Media intent starts off; the local-media hook mirrors the real device
    // toggles onto this once the user arms mic/cam in the lobby.
    micOn: false,
    camOn: false,
    isLocal: true,
  }

  return {
    session: bootstrap.session,
    localUser,
    remote: [],
    chat: [],
    whiteboards: bootstrap.boards ?? [],
    credit: {
      balance: bootstrap.creditBalance ?? 0,
      consumed: 0,
      // Per-participant per-minute burn; the heartbeat returns the authoritative
      // balance/consumed, this is only the meter's projection baseline.
      burnPerMinute: CREDIT_RATE.coinsPerMinute,
      lowThreshold: LOW_CREDIT_THRESHOLD,
    },
  }
}

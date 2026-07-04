/**
 * Mapping between app user ids and VideoSDK participant ids.
 *
 * The participant id we hand to VideoSDK is `${userId}--${nonce}` rather than
 * the bare user id. VideoSDK rejects a joiner whose participantId is already
 * present in the room (DUPLICATE_PARTICIPANT, code 4005), so a bare user id
 * breaks two everyday flows:
 *  - refreshing the classroom tab while the previous (ghost) connection is
 *    still draining on the server, and
 *  - opening the class from a second tab or device.
 * The per-tab nonce makes every connection unique while the prefix keeps the
 * participant ↔ user mapping trivial for both the UI and the attendance
 * reconciliation on the server.
 */
export function makeLiveParticipantId(userId: string | number): string {
  return `${userId}--${Math.random().toString(36).slice(2, 10)}`
}

/** Extract the app user id back out of a VideoSDK participant id. */
export function participantUserId(participantId: string | number): string {
  return String(participantId).split('--')[0]
}

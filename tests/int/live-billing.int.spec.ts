import { describe, expect, it } from 'vitest'
import { computeBillableMinutes } from '@/lib/live-billing'

describe('live class billing', () => {
  const startedAt = '2026-10-17T12:00:00.000Z'
  const session = { startedAt }

  it('charges one elapsed minute regardless of participant count', () => {
    const now = new Date('2026-10-17T12:05:00.000Z').getTime()
    const sixParticipants = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      joinedAt: startedAt,
    }))

    expect(computeBillableMinutes([], session, now)).toBe(5)
    expect(computeBillableMinutes(sixParticipants, session, now)).toBe(5)
  })

  it('rounds a partial class minute up once for the whole session', () => {
    const now = new Date('2026-10-17T12:05:01.000Z').getTime()

    expect(computeBillableMinutes([{ joinedAt: startedAt }], session, now)).toBe(6)
  })

  it('keeps the existing one-minute minimum for a newly started class', () => {
    const now = new Date(startedAt).getTime()

    expect(computeBillableMinutes([], session, now)).toBe(1)
  })
})

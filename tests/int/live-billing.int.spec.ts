import { describe, expect, it } from 'vitest'
import { computeBillableMinutes } from '@/lib/live-billing'

describe('live class billing', () => {
  const startedAt = '2026-10-17T12:00:00.000Z'
  const session = { startedAt }

  it('charges the connected minutes for every participant', () => {
    const now = new Date('2026-10-17T12:05:00.000Z').getTime()
    const sixParticipants = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      joinedAt: startedAt,
    }))

    expect(computeBillableMinutes([], session, now)).toBe(5)
    expect(computeBillableMinutes(sixParticipants, session, now)).toBe(30)
  })

  it('rounds each participant partial minute up once', () => {
    const now = new Date('2026-10-17T12:05:01.000Z').getTime()

    expect(computeBillableMinutes([{ joinedAt: startedAt }, { joinedAt: startedAt }], session, now)).toBe(12)
  })

  it('keeps the existing one-minute minimum for a newly started class', () => {
    const now = new Date(startedAt).getTime()

    expect(computeBillableMinutes([], session, now)).toBe(1)
  })

  it('charges only the time a participant was connected', () => {
    const now = new Date('2026-10-17T12:10:00.000Z').getTime()
    const logs = [
      { joinedAt: startedAt },
      {
        joinedAt: '2026-10-17T12:02:00.000Z',
        leftAt: '2026-10-17T12:05:30.000Z',
      },
    ]

    expect(computeBillableMinutes(logs, session, now)).toBe(14)
  })
})

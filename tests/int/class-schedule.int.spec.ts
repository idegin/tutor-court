import { describe, it, expect } from 'vitest'

import { getNextOccurrence, getUpcomingClasses } from '@/lib/class-schedule'

// A fixed "now" so the weekly-occurrence maths is deterministic.
// 2026-07-03 is a Friday.
const NOW = new Date('2026-07-03T12:00:00')
const DAY = 24 * 60 * 60 * 1000

function makeClass(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? 'c1',
    status: 'scheduled',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-03-01T00:00:00.000Z', // already in the past relative to NOW
    schedule: [{ day: 'friday', startTime: '13:40', endTime: '14:30' }],
    ...overrides,
  }
}

describe('class-schedule', () => {
  describe('getNextOccurrence', () => {
    it('still returns a future occurrence for an active class whose endDate has passed', () => {
      // Regression: a recurring class with a past endDate but an unchanged
      // "scheduled" status used to be dropped from the student dashboard.
      const next = getNextOccurrence(makeClass(), NOW)
      expect(next).toBeInstanceOf(Date)
      expect(next!.getTime()).toBeGreaterThanOrEqual(NOW.getTime())
      expect(next!.getTime()).toBeLessThanOrEqual(NOW.getTime() + 7 * DAY)
    })

    it('returns null only when there is no usable schedule', () => {
      expect(getNextOccurrence(makeClass({ schedule: [] }), NOW)).toBeNull()
      expect(getNextOccurrence(makeClass({ schedule: undefined }), NOW)).toBeNull()
    })

    it('respects a still-open endDate as an upper bound', () => {
      // endDate is today (Friday); the only slot is Monday → the next occurrence
      // falls after the window closes, so nothing remains in-window.
      const next = getNextOccurrence(
        makeClass({
          endDate: '2026-07-03T00:00:00.000Z',
          schedule: [{ day: 'monday', startTime: '09:00' }],
        }),
        NOW,
      )
      expect(next).toBeNull()
    })
  })

  describe('getUpcomingClasses', () => {
    it('keeps active classes even when their series endDate has passed', () => {
      const upcoming = getUpcomingClasses([makeClass()], NOW)
      expect(upcoming).toHaveLength(1)
      expect(upcoming[0].nextOccurrence).toBeInstanceOf(Date)
    })

    it('excludes completed and cancelled classes', () => {
      const upcoming = getUpcomingClasses(
        [
          makeClass({ id: 'a', status: 'scheduled' }),
          makeClass({ id: 'b', status: 'completed' }),
          makeClass({ id: 'c', status: 'cancelled' }),
          makeClass({ id: 'd', status: 'active' }),
        ],
        NOW,
      )
      expect(upcoming.map((c) => c.id).sort()).toEqual(['a', 'd'])
    })

    it('orders classes soonest-first by next occurrence', () => {
      const monday = makeClass({
        id: 'mon',
        schedule: [{ day: 'monday', startTime: '09:00' }],
      })
      const friday = makeClass({
        id: 'fri',
        schedule: [{ day: 'friday', startTime: '13:40' }],
      })
      // From Friday NOW, next Friday 13:40 (today, later) comes before next Monday.
      const upcoming = getUpcomingClasses([monday, friday], NOW)
      expect(upcoming[0].id).toBe('fri')
      expect(upcoming[1].id).toBe('mon')
    })

    it('still includes an active class with no computable occurrence, sorted last', () => {
      const withTime = makeClass({ id: 'timed' })
      const noSchedule = makeClass({ id: 'untimed', schedule: [] })
      const upcoming = getUpcomingClasses([noSchedule, withTime], NOW)
      expect(upcoming).toHaveLength(2)
      expect(upcoming[0].id).toBe('timed')
      expect(upcoming[1].id).toBe('untimed')
      expect(upcoming[1].nextOccurrence).toBeNull()
    })
  })
})

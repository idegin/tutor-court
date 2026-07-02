/**
 * Classes recur weekly on the days in their `schedule` (day-of-week + HH:MM),
 * bounded by startDate/endDate. The dashboards need the NEXT upcoming occurrence
 * so they can (a) drop classes whose series has ended and (b) sort soonest-first
 * instead of by the series' original start date.
 */

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

type ScheduleSlot = { day?: string; startTime?: string }

/**
 * Returns the next occurrence Date at/after `now`, or null when the class has no
 * future occurrence (series ended, or no schedule). Times are treated in the
 * server's local zone — matching how the dashboards render day/time labels.
 */
export function getNextOccurrence(cls: any, now: Date): Date | null {
  const schedule: ScheduleSlot[] = Array.isArray(cls?.schedule) ? cls.schedule : []
  if (schedule.length === 0) return null

  const endOfSeries = cls?.endDate ? new Date(cls.endDate) : null
  if (endOfSeries) {
    endOfSeries.setHours(23, 59, 59, 999)
    if (endOfSeries.getTime() < now.getTime()) return null
  }

  // If the series hasn't started yet, count occurrences from the start date.
  const startDate = cls?.startDate ? new Date(cls.startDate) : null
  const base = startDate && startDate.getTime() > now.getTime() ? startDate : now

  let best: Date | null = null
  for (const slot of schedule) {
    const dow = slot?.day ? DAY_INDEX[slot.day] : undefined
    if (dow === undefined) continue

    const [h, m] = String(slot.startTime || '00:00').split(':').map((n) => Number(n))
    const candidate = new Date(base)
    candidate.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0)

    let diff = (dow - candidate.getDay() + 7) % 7
    if (diff === 0 && candidate.getTime() < base.getTime()) diff = 7
    candidate.setDate(candidate.getDate() + diff)

    if (endOfSeries && candidate.getTime() > endOfSeries.getTime()) continue
    if (!best || candidate.getTime() < best.getTime()) best = candidate
  }
  return best
}

/**
 * Filters out ended/completed/cancelled classes and returns those with a future
 * occurrence, sorted soonest-first. Each item is the original class with a
 * `nextOccurrence` Date attached.
 */
export function getUpcomingClasses<T extends Record<string, any>>(
  classes: T[],
  now: Date = new Date(),
): (T & { nextOccurrence: Date })[] {
  return classes
    .filter((c) => c.status !== 'completed' && c.status !== 'cancelled')
    .map((c) => {
      const nextOccurrence = getNextOccurrence(c, now)
      return nextOccurrence ? { ...c, nextOccurrence } : null
    })
    .filter((c): c is T & { nextOccurrence: Date } => c !== null)
    .sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime())
}

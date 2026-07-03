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
 * Returns the next weekly occurrence Date at/after `now` from the class schedule,
 * or null only when the class has no usable schedule. Times are treated in the
 * server's local zone — matching how the dashboards render day/time labels.
 *
 * `endDate` is treated as an upper bound ONLY while the series window is still
 * open (endDate >= now). A class that is still active/scheduled past its endDate
 * keeps producing a next occurrence so the dashboard mirrors the Classes page
 * (which lists a class as "active & upcoming" purely by status). Otherwise a
 * still-running recurring class silently vanished from the student's overview
 * the moment its original endDate passed, even though its status was unchanged.
 */
export function getNextOccurrence(cls: any, now: Date): Date | null {
  const schedule: ScheduleSlot[] = Array.isArray(cls?.schedule) ? cls.schedule : []
  if (schedule.length === 0) return null

  const endOfSeries = cls?.endDate ? new Date(cls.endDate) : null
  if (endOfSeries) endOfSeries.setHours(23, 59, 59, 999)
  // Only clamp future occurrences to the endDate while the series is still within
  // its window; a past endDate no longer bounds an otherwise-active class.
  const bound =
    endOfSeries && endOfSeries.getTime() >= now.getTime() ? endOfSeries : null

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

    if (bound && candidate.getTime() > bound.getTime()) continue
    if (!best || candidate.getTime() < best.getTime()) best = candidate
  }
  return best
}

/**
 * Returns a student's/parent's active classes — everything that isn't completed
 * or cancelled, i.e. the same set the Classes page shows as "active & upcoming" —
 * sorted soonest-first by their next occurrence. A class is never dropped for
 * lacking a computable occurrence (e.g. its series endDate has passed but it's
 * still active); such classes just sort after those with a concrete next time.
 * Each item carries a `nextOccurrence` (null when none could be computed).
 */
export function getUpcomingClasses<T extends Record<string, any>>(
  classes: T[],
  now: Date = new Date(),
): (T & { nextOccurrence: Date | null })[] {
  return classes
    .filter((c) => c.status !== 'completed' && c.status !== 'cancelled')
    .map((c) => ({ ...c, nextOccurrence: getNextOccurrence(c, now) }))
    .sort((a, b) => {
      const at = a.nextOccurrence ? a.nextOccurrence.getTime() : Infinity
      const bt = b.nextOccurrence ? b.nextOccurrence.getTime() : Infinity
      return at - bt
    })
}

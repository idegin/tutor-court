/**
 * Authoritative booking-price computation.
 *
 * This is the single source of truth for how a marketplace booking is priced.
 * It is a pure module (no server/Payload imports) so it can be shared between
 * the booking API route (authoritative) and the booking modal (live estimate).
 *
 * A booking spans a date range with a recurring weekly schedule. The price is:
 *   (number of matching weekday occurrences in the range) × hoursPerDay × hourlyRate
 *
 * Counting the actual weekday occurrences in the range is what makes this
 * authoritative — the previous rough estimate (`ceil(days / 7) × daysOfWeek`)
 * over/under-counted depending on which weekdays fell inside the range.
 */

export type WeekdayName =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'

const WEEKDAY_INDEX: Record<WeekdayName, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

export interface BookingPriceInput {
  startDate: string | Date
  endDate: string | Date
  daysOfWeek: string[]
  hoursPerDay: number
  hourlyRate: number
}

export interface BookingPriceBreakdown {
  /** Number of individual sessions (matching weekday occurrences within the range). */
  sessions: number
  /** Total teaching hours across the engagement. */
  totalHours: number
  /** Hourly rate used for the calculation. */
  hourlyRate: number
  /** Hours taught on each scheduled day. */
  hoursPerDay: number
  /** Final total price. */
  totalPrice: number
  /** Whether the inputs produced a valid, chargeable schedule. */
  valid: boolean
}

/** Normalise a date input to a UTC midnight timestamp so day-counting is TZ-stable. */
function toUtcMidnight(value: string | Date): number | null {
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return null
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Count how many days between start and end (inclusive) fall on one of the
 * selected weekdays.
 */
export function countSessions(
  startDate: string | Date,
  endDate: string | Date,
  daysOfWeek: string[],
): number {
  const start = toUtcMidnight(startDate)
  const end = toUtcMidnight(endDate)
  if (start == null || end == null || end < start) return 0

  const wanted = new Set(
    (daysOfWeek || [])
      .map((d) => WEEKDAY_INDEX[d as WeekdayName])
      .filter((n): n is number => typeof n === 'number'),
  )
  if (wanted.size === 0) return 0

  let sessions = 0
  for (let t = start; t <= end; t += DAY_MS) {
    const weekday = new Date(t).getUTCDay()
    if (wanted.has(weekday)) sessions++
  }
  return sessions
}

/**
 * Compute the full, authoritative price breakdown for a booking.
 * Returns `valid: false` (and zeroed totals) when the schedule is empty or the
 * rate is not set, so callers can reject or show a helpful message.
 */
export function computeBookingPrice(input: BookingPriceInput): BookingPriceBreakdown {
  const hourlyRate = Number(input.hourlyRate) || 0
  const hoursPerDay = Math.max(0, Number(input.hoursPerDay) || 0)
  const sessions = countSessions(input.startDate, input.endDate, input.daysOfWeek)
  const totalHours = sessions * hoursPerDay
  const totalPrice = Math.round(totalHours * hourlyRate)
  const valid = sessions > 0 && hoursPerDay > 0 && hourlyRate > 0

  return { sessions, totalHours, hourlyRate, hoursPerDay, totalPrice, valid }
}

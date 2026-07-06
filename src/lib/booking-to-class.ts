import type { Payload } from 'payload'

/**
 * Stage 5 — materialize a schedulable `Class` from a paid (held) marketplace
 * booking, and link the two (booking.class ↔ class.booking). Idempotent: if the
 * booking already has a class, it does nothing.
 *
 * The live-class engine keys entirely off `Classes.students`/`parents`, so once
 * the booking's student/parent are enrolled they can join `/classroom/[classId]`
 * with no booking-specific plumbing.
 */

const idOf = (rel: any): string | number | null =>
  rel == null ? null : typeof rel === 'object' ? rel.id : rel

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/** Build a weekly schedule from the booking's days + hours, anchored to the
 * tutor's availability for each day (falling back to 09:00). */
function deriveSchedule(
  daysOfWeek: string[],
  hoursPerDay: number,
  availability: { day?: string; startTime?: string; endTime?: string }[],
) {
  const hours = Math.max(1, Math.min(12, Math.round(Number(hoursPerDay) || 1)))
  return (daysOfWeek || []).map((day) => {
    const slot = (availability || []).find((a) => a?.day === day && HHMM.test(String(a?.startTime || '')))
    const startTime = slot?.startTime && HHMM.test(slot.startTime) ? slot.startTime : '09:00'
    const [h, m] = startTime.split(':').map(Number)
    let endH = h + hours
    let endM = m
    if (endH > 23) {
      endH = 23
      endM = 59
    }
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
    return { day, startTime, endTime }
  })
}

export async function materializeClassFromBooking(
  payload: Payload,
  bookingId: string | number,
): Promise<{ ok: boolean; classId?: string | number; skipped?: boolean; error?: string }> {
  let booking: any
  try {
    booking = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 2, overrideAccess: true })
  } catch {
    return { ok: false, error: 'Booking not found.' }
  }
  if (!booking) return { ok: false, error: 'Booking not found.' }

  // Idempotent — already materialized.
  if (booking.class) return { ok: true, classId: idOf(booking.class)!, skipped: true }
  if (booking.paymentStatus !== 'held') return { ok: false, error: 'Booking is not funded.' }

  const tutorProfile = booking.tutor
  const tutorUserId =
    tutorProfile && typeof tutorProfile === 'object' ? idOf(tutorProfile.user) : null
  if (!tutorUserId) return { ok: false, error: 'Could not resolve the tutor user.' }

  const studentId = idOf(booking.student)
  const parentId = idOf(booking.parent)
  const subjectId = Array.isArray(booking.subjects) && booking.subjects.length
    ? idOf(booking.subjects[0])
    : null
  if (!subjectId) return { ok: false, error: 'Booking has no subject.' }

  const availability =
    tutorProfile && typeof tutorProfile === 'object' && Array.isArray(tutorProfile.weeklyAvailability)
      ? tutorProfile.weeklyAvailability
      : []
  const schedule = deriveSchedule(booking.daysOfWeek || [], booking.hoursPerDay || 1, availability)
  if (schedule.length === 0) return { ok: false, error: 'Booking has no scheduled days.' }

  try {
    const created = await payload.create({
      collection: 'classes',
      data: {
        tutor: tutorUserId,
        subject: subjectId,
        description: booking.message || 'Booked tutoring engagement.',
        classType: 'one-on-one',
        ...(booking.gradeLevel ? { gradeLevel: booking.gradeLevel } : {}),
        ...(booking.timezone ? { timezone: booking.timezone } : {}),
        maxStudents: 1,
        startDate: booking.date,
        endDate: booking.endDate,
        schedule,
        students: studentId ? [studentId] : [],
        ...(parentId ? { parents: [parentId] } : {}),
        status: 'scheduled',
        booking: numericId(bookingId),
      } as any,
      overrideAccess: true,
    })

    await payload.update({
      collection: 'bookings',
      id: bookingId,
      data: { class: created.id } as any,
      overrideAccess: true,
    })

    return { ok: true, classId: created.id }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Failed to create class from booking.' }
  }
}

const numericId = (v: any): string | number =>
  typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v

/**
 * Shared calendar-event expansion for the dashboard calendars.
 *
 * Turns each class's recurring weekly `schedule` (day + startTime/endTime) over
 * its `startDate`..`endDate` range into concrete, dated events. Times are
 * interpreted in the class's own `timezone` (not the server's), so the same
 * class renders at the correct wall-clock time regardless of where the server
 * runs or where the viewer is.
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

// Class status -> calendar event status (the calendar UI styles these).
const STATUS_MAP: Record<string, 'confirmed' | 'pending' | 'completed'> = {
  active: 'confirmed',
  completed: 'completed',
  scheduled: 'pending',
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Offset (ms) between the given instant's wall-clock in `tz` and UTC. */
function tzOffsetMs(utcDate: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const map: Record<string, string> = {}
  for (const p of dtf.formatToParts(utcDate)) if (p.type !== 'literal') map[p.type] = p.value
  const hour = map.hour === '24' ? '00' : map.hour
  const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +hour, +map.minute, +map.second)
  return asUTC - utcDate.getTime()
}

/** The UTC instant of a wall-clock time (y, monthIndex, d, h, min) in `tz`. */
function zonedWallTimeToUtc(
  y: number,
  monthIndex: number,
  d: number,
  h: number,
  min: number,
  tz: string,
): Date {
  const utcGuess = Date.UTC(y, monthIndex, d, h, min, 0)
  const offset = tzOffsetMs(new Date(utcGuess), tz)
  return new Date(utcGuess - offset)
}

interface EventOptions {
  /** Whose calendar this is — controls the event title/student labelling. */
  role: 'tutor' | 'student' | 'parent'
  /** The current tutor's name (only used for the tutor view). */
  viewerTutorName?: string
  defaultTimeZone?: string
}

export function generateRecurringEvents(classes: any[], opts: EventOptions): any[] {
  const { role, viewerTutorName = '', defaultTimeZone = 'Africa/Lagos' } = opts
  const events: any[] = []

  for (const cls of classes) {
    // Cancelled classes should not appear on the calendar at all.
    if (cls.status === 'cancelled') continue

    const start = new Date(cls.startDate)
    const end = new Date(cls.endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue
    const tz = cls.timezone || defaultTimeZone
    const schedule = Array.isArray(cls.schedule) ? cls.schedule : []
    const eventStatus = STATUS_MAP[cls.status] || 'pending'

    // Iterate calendar days by their date parts (a Y-M-D has an unambiguous
    // weekday, independent of any timezone), then place the wall-clock time.
    const startYMD = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 12)
    const endYMD = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 12)

    for (const item of schedule) {
      if (!item?.day || !item?.startTime || !item?.endTime) continue
      const targetDay = DAY_INDEX[String(item.day).toLowerCase()]
      if (targetDay === undefined) continue

      const [startH, startM] = String(item.startTime).split(':').map(Number)
      const [endH, endM] = String(item.endTime).split(':').map(Number)
      if ([startH, startM, endH, endM].some((n) => isNaN(n))) continue

      for (let t = startYMD; t <= endYMD; t += DAY_MS) {
        const day = new Date(t)
        if (day.getUTCDay() !== targetDay) continue

        const y = day.getUTCFullYear()
        const m = day.getUTCMonth()
        const d = day.getUTCDate()
        const eventStart = zonedWallTimeToUtc(y, m, d, startH, startM, tz)
        const eventEnd = zonedWallTimeToUtc(y, m, d, endH, endM, tz)

        const students = Array.isArray(cls.students) ? cls.students : []
        const named = students
          .map((s: any) => `${s?.firstName || ''} ${s?.lastName || ''}`.trim())
          .filter(Boolean)
        const studentNames = named.length > 0 ? named.join(', ') : 'No students'

        const subjectName =
          typeof cls.subject === 'object' && cls.subject ? cls.subject.name : cls.subject || 'No Subject'

        const classTutorName =
          cls.tutor && typeof cls.tutor === 'object'
            ? `${cls.tutor.firstName || ''} ${cls.tutor.lastName || ''}`.trim() || 'Tutor'
            : 'Tutor'

        // Title + student/tutor labels depend on whose calendar this is.
        let eventTitle: string
        let tutorName: string
        let studentLabel: string
        if (role === 'tutor') {
          tutorName = viewerTutorName
          studentLabel = studentNames
          eventTitle =
            cls.classType === 'one-on-one'
              ? `${subjectName} with ${named[0] || 'No Student'}`
              : `${subjectName} (Group - ${named.length} Student${named.length !== 1 ? 's' : ''})`
        } else {
          tutorName = classTutorName
          studentLabel = role === 'student' ? 'You' : studentNames
          eventTitle = `${subjectName} with ${classTutorName}`
        }

        const dayLabel = String(item.day).charAt(0).toUpperCase() + String(item.day).slice(1)
        events.push({
          id: `${cls.id}-${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          classId: cls.id,
          title: eventTitle,
          subject: subjectName,
          start: eventStart.toISOString(),
          end: eventEnd.toISOString(),
          student: studentLabel,
          tutorName,
          status: eventStatus,
          description: cls.description,
          scheduleText: `${dayLabel} (${item.startTime} - ${item.endTime})`,
        })
      }
    }
  }

  return events
}

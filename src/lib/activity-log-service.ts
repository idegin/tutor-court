import type { Payload } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'

export type ActivityLogType =
  | 'assessment_assigned'
  | 'assessment_completed'
  | 'class_joined'
  | 'class_left'
  | 'class_ended'

type Id = string | number

export type ActivityLogEntry = {
  subjectId: Id
  actorId?: Id
  type: ActivityLogType
  title: string
  description?: string
  link?: string
  relatedCollection?: string
  relatedId?: string
  metadata?: Record<string, unknown>
}

const writeOne = async (payload: Payload, entry: ActivityLogEntry): Promise<void> => {
  await payload.create({
    collection: 'activity-logs',
    data: {
      subject: entry.subjectId,
      actor: entry.actorId ?? entry.subjectId,
      type: entry.type,
      title: entry.title,
      description: entry.description,
      link: entry.link,
      relatedCollection: entry.relatedCollection,
      relatedId: entry.relatedId,
      metadata: entry.metadata,
    } as any,
    overrideAccess: true,
  })
}

/**
 * Write a single activity-log row.
 * Failures are swallowed so instrumentation never breaks the main flow.
 */
export async function createActivityLog(entry: ActivityLogEntry): Promise<void> {
  try {
    const payload = await getPayload({ config })
    await writeOne(payload, entry)
  } catch (err) {
    console.error('[ActivityLog] Failed to write log:', err)
  }
}

/**
 * Write the same event from multiple perspectives — one row per subject.
 * Use this for events that should appear on more than one user's feed
 * (e.g. a class_joined event surfaces on both the student's and tutor's feed).
 */
export async function createActivityLogs(entries: ActivityLogEntry[]): Promise<void> {
  if (!entries.length) return
  try {
    const payload = await getPayload({ config })
    await Promise.all(entries.map((entry) => writeOne(payload, entry)))
  } catch (err) {
    console.error('[ActivityLog] Failed to write logs:', err)
  }
}

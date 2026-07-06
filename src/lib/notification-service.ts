import { getPayload } from 'payload'
import config from '@payload-config'

export type NotificationType =
  | 'student_joined_class'
  | 'parent_accepted_invite'
  | 'student_added_to_class'
  | 'assessment_completed'
  | 'assessment_sent'
  | 'new_booking'
  | 'class_reminder'
  | 'payment_received'
  | 'general'

interface CreateNotificationParams {
  recipientId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  relatedCollection?: string
  relatedId?: string
}

/**
 * Creates a single in-app notification for a user.
 */
export async function createNotification({
  recipientId,
  type,
  title,
  message,
  link,
  relatedCollection,
  relatedId,
}: CreateNotificationParams): Promise<void> {
  try {
    const payload = await getPayload({ config })
    // Coerce numeric-string ids to numbers so the Postgres relationship
    // validates (a stringified id fails the FK check).
    const numericId = (v: string): string | number => (/^\d+$/.test(v) ? Number(v) : v)
    await payload.create({
      collection: 'notifications',
      overrideAccess: true,
      data: {
        recipient: numericId(recipientId),
        type,
        title,
        message,
        isRead: false,
        link: link || null,
        relatedEntity: relatedCollection && relatedId
          ? { collection: relatedCollection, id: numericId(relatedId) }
          : undefined,
      } as any,
    })
  } catch (err) {
    // Non-critical: log but don't rethrow so callers aren't interrupted
    console.error('[NotificationService] Failed to create notification:', err)
  }
}

/**
 * Marks all unread notifications for a recipient as read.
 */
export async function markAllNotificationsRead(recipientId: string): Promise<void> {
  const payload = await getPayload({ config })
  const unread = await payload.find({
    collection: 'notifications',
    where: {
      and: [
        { recipient: { equals: recipientId } },
        { isRead: { equals: false } },
      ],
    },
    limit: 500,
    depth: 0,
  })
  for (const notif of unread.docs) {
    await payload.update({
      collection: 'notifications',
      id: notif.id,
      data: { isRead: true } as any,
    })
  }
}

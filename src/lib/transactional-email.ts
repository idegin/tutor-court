import type { Payload } from 'payload'
import { getBaseEmailLayout, getEmailServerUrl, type EmailHeaders } from './email-template'
import { sendEmail } from './email-service'

/**
 * Fire-and-forget transactional email to a user by id. Never throws — a failed
 * email must not roll back the money/state change that already happened. Usable
 * from routes (pass request headers for a correct origin), collection hooks, and
 * cron (no headers → falls back to NEXT_PUBLIC_SERVER_URL / Vercel host).
 */
export async function emailUserById(
  payload: Payload,
  userId: string | number | null | undefined,
  subject: string,
  heading: string,
  innerHtml: string,
  opts?: { link?: string; linkLabel?: string; headers?: EmailHeaders },
): Promise<void> {
  if (userId == null) return
  try {
    const user: any = await payload.findByID({ collection: 'users', id: userId as any, overrideAccess: true })
    if (!user?.email) return
    const serverUrl = getEmailServerUrl(opts?.headers)
    const cta = opts?.link
      ? `<div class="btn-container"><a href="${serverUrl}${opts.link}" class="btn">${opts.linkLabel || 'View details'}</a></div>`
      : ''
    await sendEmail({
      to: user.email,
      subject,
      html: getBaseEmailLayout(heading, `${innerHtml}${cta}`, serverUrl),
    })
  } catch (e: any) {
    console.error('[transactional-email] failed:', e?.message)
  }
}

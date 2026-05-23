/**
 * Email service using the ZeptoMail SDK directly.
 * Replaces the nodemailer SMTP adapter which was unreliable.
 * Docs: https://www.npmjs.com/package/zeptomail
 */
import { SendMailClient } from 'zeptomail'

const ZEPTO_URL = 'https://api.zeptomail.com/v1.1/email'
const _rawToken = process.env.ZEPTO_MAIL_API_KEY || ''
// ZeptoMail SDK uses the token directly as the Authorization header value.
// The full value must be: "Zoho-enczapikey <key>" — prefix it if missing.
const ZEPTO_TOKEN = _rawToken.startsWith('Zoho-enczapikey ')
  ? _rawToken
  : `Zoho-enczapikey ${_rawToken}`
const FROM_ADDRESS = process.env.ZEPTO_MAIL_FROM || 'noreply@idegin.com'
const FROM_NAME = 'TutorCourt'

if (!_rawToken) {
  console.warn('[EmailService] ⚠️  ZEPTO_MAIL_API_KEY is not set. Emails will not be sent.')
}

let _client: SendMailClient | null = null

function getClient(): SendMailClient {
  if (!_client) {
    console.log(`[EmailService] Initialising ZeptoMail client (url=${ZEPTO_URL})`)
    _client = new SendMailClient({ url: ZEPTO_URL, token: ZEPTO_TOKEN })
  }
  return _client
}

export interface SendEmailParams {
  to: string | { address: string; name?: string }
  subject: string
  html: string
  replyTo?: string
}

/**
 * Send a transactional email via ZeptoMail SDK.
 * Logs success/failure at every step for easy debugging.
 */
export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams): Promise<void> {
  if (!_rawToken) {
    console.error('[EmailService] Cannot send email — ZEPTO_MAIL_API_KEY is missing.')
    return
  }

  const toAddress = typeof to === 'string' ? { address: to } : to

  console.log(`[EmailService] Preparing email → to="${toAddress.address}" subject="${subject}"`)

  const payload = {
    from: {
      address: FROM_ADDRESS,
      name: FROM_NAME,
    },
    to: [
      {
        email_address: {
          address: toAddress.address,
          name: toAddress.name || toAddress.address,
        },
      },
    ],
    subject,
    htmlbody: html,
    ...(replyTo ? { reply_to: [{ address: replyTo }] } : {}),
  }

  console.log(
    '[EmailService] Payload:',
    JSON.stringify({ to: payload.to, subject, from: payload.from }, null, 2),
  )

  try {
    const client = getClient()
    const resp = await client.sendMail(payload)
    console.log('[EmailService] ✅ Email sent successfully:', JSON.stringify(resp))
  } catch (error: any) {
    console.error('[EmailService] ❌ Failed to send email:')
    console.error('  Message:', error?.message)
    console.error('  Status:', error?.status || error?.statusCode)
    console.error('  Response body:', JSON.stringify(error?.response?.data || error?.data || error))
    throw error
  }
}

import crypto from 'crypto'

function base64url(str: string | Buffer): string {
  const base64 =
    typeof str === 'string' ? Buffer.from(str).toString('base64') : str.toString('base64')
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

const isPlaceholder = (value: string | undefined, placeholder: string): boolean =>
  !value || value === placeholder

/**
 * Returns true when the VideoSDK credentials are present and usable.
 * Used as the server-side gate before allowing tutors to start a live class
 * or participants to join — see api/live-sessions/* routes.
 */
export function isVideoSdkAvailable(): boolean {
  const apiKey = process.env.VIDEOSDK_API_KEY
  const secretKey = process.env.VIDEOSDK_SECRET
  if (
    !isPlaceholder(apiKey, 'videosdk_api_key_placeholder') &&
    !isPlaceholder(secretKey, 'videosdk_secret_placeholder')
  ) {
    return true
  }

  const fallbackToken = process.env.NEXT_PUBLIC_VIDEOSDK_TOKEN
  return !isPlaceholder(fallbackToken, 'videosdk_token_placeholder')
}

export function generateVideoSdkToken(expirationSeconds: number = 3600 * 2): string {
  const apiKey = process.env.VIDEOSDK_API_KEY
  const secretKey = process.env.VIDEOSDK_SECRET

  if (
    isPlaceholder(apiKey, 'videosdk_api_key_placeholder') ||
    isPlaceholder(secretKey, 'videosdk_secret_placeholder')
  ) {
    const fallbackToken = process.env.NEXT_PUBLIC_VIDEOSDK_TOKEN
    if (!isPlaceholder(fallbackToken, 'videosdk_token_placeholder')) {
      return fallbackToken as string
    }
    return ''
  }

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }
  const payload = {
    apikey: apiKey,
    permissions: ['allow_join', 'allow_mod', 'ask_join'],
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expirationSeconds,
  }

  const headerB64 = base64url(JSON.stringify(header))
  const payloadB64 = base64url(JSON.stringify(payload))
  const signatureInput = `${headerB64}.${payloadB64}`

  const signature = crypto.createHmac('sha256', secretKey as string).update(signatureInput).digest()

  const signatureB64 = base64url(signature)
  return `${signatureInput}.${signatureB64}`
}

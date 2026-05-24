type HeadersGetter = { get: (name: string) => string | null | undefined }
type HeadersRecord = Record<string, string | string[] | undefined>
export type EmailHeaders = HeadersGetter | HeadersRecord | Headers | null | undefined

const readHeader = (headers: EmailHeaders, name: string): string | undefined => {
  if (!headers) return undefined
  const lower = name.toLowerCase()
  if (typeof (headers as HeadersGetter).get === 'function') {
    const v = (headers as HeadersGetter).get(lower) ?? (headers as HeadersGetter).get(name)
    return v ?? undefined
  }
  const rec = headers as HeadersRecord
  const raw = rec[lower] ?? rec[name]
  if (Array.isArray(raw)) return raw[0]
  return raw ?? undefined
}

const isLocalHost = (host: string) =>
  host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('0.0.0.0')

export const getEmailServerUrl = (headers?: EmailHeaders): string => {
  // 1. Prefer the actual incoming request host (so emails sent from a deploy preview,
  //    local dev, or staging all link back to the correct origin).
  if (headers) {
    const forwardedHost = readHeader(headers, 'x-forwarded-host')
    const host = forwardedHost || readHeader(headers, 'host')
    if (host) {
      const forwardedProto = readHeader(headers, 'x-forwarded-proto')
      const proto = forwardedProto || (isLocalHost(host) ? 'http' : 'https')
      return `${proto}://${host}`.replace(/\/$/, '')
    }
  }

  // 2. Explicit env override.
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return process.env.NEXT_PUBLIC_SERVER_URL.replace(/\/$/, '')
  }

  // 3. Vercel-injected hostnames (build/runtime).
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 4. Last-resort local dev fallback.
  return 'http://localhost:5021'
}

export const getBaseEmailLayout = (
  title: string,
  content: string,
  headersOrUrl?: EmailHeaders | string,
) => {
  const hostUrl =
    typeof headersOrUrl === 'string' ? headersOrUrl.replace(/\/$/, '') : getEmailServerUrl(headersOrUrl)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      color: #374151;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .wrapper {
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      background-color: #ffffff;
      padding: 32px 40px;
      text-align: center;
      border-bottom: 1px solid #f3f4f6;
    }
    .logo-container {
      display: inline-block;
      text-align: center;
    }
    .logo {
      width: 48px;
      height: auto;
      vertical-align: middle;
      border-radius: 12px;
    }
    .brand-name {
      display: inline-block;
      vertical-align: middle;
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-left: 12px;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px;
      text-align: left;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .text {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .btn-container {
      margin-top: 32px;
      margin-bottom: 32px;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background-color: #6d28d9; /* tutor-purple */
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #5b21b6;
    }
    .footer {
      text-align: center;
      padding: 32px 40px;
      background-color: #f9fafb;
      border-top: 1px solid #f3f4f6;
      color: #6b7280;
      font-size: 14px;
    }
    .footer p {
      margin: 0;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 32px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="wrapper">
      <div class="header">
        <div class="logo-container">
          <img src="${hostUrl}/logo.png" alt="TutorCourt Logo" class="logo" />
          <span class="brand-name">TutorCourt</span>
        </div>
      </div>
      <div class="content">
        <h1 class="title">${title}</h1>
        ${content}
        <div class="divider"></div>
        <p class="text" style="font-size: 14px; color: #6b7280;">If you didn't request this email, you can safely ignore it.</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} TutorCourt. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

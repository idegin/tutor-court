import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

// Shared auth helper for Route Handlers (API routes).
// Strips the Origin header before calling payload.auth() for the same reason
// getServerSideUser does — Payload v3 validates Origin against the CSRF whitelist
// even in the local API, which breaks when the browser sends www.tutorcourt.com
// but NEXT_PUBLIC_SERVER_URL is tutorcourt.com (or vice versa).
export async function getRouteUser() {
  const rawHeaders = await getHeaders()
  const headers = new Headers(rawHeaders)
  headers.delete('origin')
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  return { user, payload }
}

export const getServerSideUser = async () => {
  const requestHeaders = await getHeaders()

  // Strip the Origin header before passing to payload.auth().
  // Payload v3 checks Origin against the csrf whitelist even in the local API.
  // Our cookies are SameSite=Lax so cross-site writes can't include them —
  // the Origin check is redundant here and breaks when the browser hits
  // www.tutorcourt.com but NEXT_PUBLIC_SERVER_URL is tutorcourt.com (or vice versa).
  const headers = new Headers(requestHeaders)
  headers.delete('origin')

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })

  const { docs: subjects } = await payload.find({
      collection: 'subjects',
      depth: 0,
      limit: 100,
  })

  if (!user) return { user: null, tutorProfile: null, dependencies: { subjects } }

  let tutorProfile = null
  if (user.accountType === 'tutor') {
      const { docs } = await payload.find({
          collection: 'tutor-profiles',
          where: { user: { equals: user.id } },
          depth: 0,
      })
      tutorProfile = docs[0] || null
  }

  return { user, tutorProfile, dependencies: { subjects } }
}

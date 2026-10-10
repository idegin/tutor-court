import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

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

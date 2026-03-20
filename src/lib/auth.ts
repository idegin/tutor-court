import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

export const getServerSideUser = async () => {
  const headers = await getHeaders()
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

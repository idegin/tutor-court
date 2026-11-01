import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.tutorcourt.com'

  let subjectDocs: any[] = []
  let tutorDocs: any[] = []

  try {
    const payload = await getPayload({ config: configPromise })
    const [subjectsResult, tutorsResult] = await Promise.all([
      payload.find({ collection: 'subjects', limit: 1000, depth: 0 }),
      payload.find({
        collection: 'tutor-profiles',
        where: { isApproved: { equals: true } },
        limit: 5000,
        depth: 0,
      }),
    ])
    subjectDocs = subjectsResult.docs
    tutorDocs = tutorsResult.docs
  } catch {
    // DB unavailable at static build time — serve static routes only
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/subjects`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/for-parents`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/for-tutors`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]

  const subjectRoutes: MetadataRoute.Sitemap = subjectDocs
    .filter((s: any) => typeof s.slug === 'string' && s.slug.trim() !== '')
    .map((s: any) => ({
      url: `${baseUrl}/subjects/${s.slug}`,
      lastModified: new Date(s.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  const tutorRoutes: MetadataRoute.Sitemap = tutorDocs
    .filter((t: any) => typeof t.slug === 'string' && t.slug.trim() !== '')
    .map((t: any) => ({
      url: `${baseUrl}/tutors/${t.slug}`,
      lastModified: new Date(t.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

  return [...staticRoutes, ...subjectRoutes, ...tutorRoutes]
}

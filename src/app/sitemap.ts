import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.tutorcourt.com'
  const payload = await getPayload({ config: configPromise })

  const [subjectDocs, tutorDocs] = await Promise.all([
    payload.find({ collection: 'subjects', limit: 1000, depth: 0 }),
    payload.find({
      collection: 'tutor-profiles',
      where: { isApproved: { equals: true } },
      limit: 5000,
      depth: 0,
    }),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/subjects`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/for-parents`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/for-tutors`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]

  const subjectRoutes: MetadataRoute.Sitemap = subjectDocs.docs.map((s: any) => ({
    url: `${baseUrl}/subjects/${s.slug}`,
    lastModified: new Date(s.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const tutorRoutes: MetadataRoute.Sitemap = tutorDocs.docs.map((t: any) => ({
    url: `${baseUrl}/tutors/${t.slug}`,
    lastModified: new Date(t.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...subjectRoutes, ...tutorRoutes]
}

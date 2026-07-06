'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function fetchTutors(searchParams: any, page: number = 1) {
  const payload = await getPayload({ config: configPromise })

  // Helper to extract first string value
  const getParam = (k: string) => {
    const val = searchParams[k]
    return typeof val === 'string' ? val : Array.isArray(val) ? val[0] : undefined
  }

  // Parse params
  // Only constrain by price when the user has explicitly set a bound. The slider's
  // ceiling (50,000) is treated as "no upper bound", so it never sets `maxPrice`.
  const minPriceRaw = getParam('minPrice')
  const maxPriceRaw = getParam('maxPrice')
  const hasMinPrice = minPriceRaw !== undefined && minPriceRaw !== ''
  const hasMaxPrice = maxPriceRaw !== undefined && maxPriceRaw !== ''
  const minPrice = Number(minPriceRaw) || 0
  const maxPrice = Number(maxPriceRaw) || 0
  const q = getParam('q')?.trim()
  const ratingList = Array.isArray(searchParams['rating'])
    ? searchParams['rating']
    : searchParams['rating']
      ? [searchParams['rating']]
      : []
  const ratingParam = ratingList.length > 0 ? Math.min(...ratingList.map(Number)) : undefined

  const subjects = searchParams['subject']
    ? Array.isArray(searchParams['subject'])
      ? searchParams['subject']
      : [searchParams['subject']]
    : []

  const subjectIds: string[] = subjects as string[]

  const where: any = {
    and: [{ isApproved: { equals: true } }],
  }

  // Only bound by price when explicitly requested, so tutors with a null hourlyRate
  // (and those above the slider ceiling) are not silently excluded.
  if (hasMinPrice) {
    where.and.push({ hourlyRate: { greater_than_equal: minPrice } })
  }
  if (hasMaxPrice) {
    where.and.push({ hourlyRate: { less_than_equal: maxPrice } })
  }

  // Free-text keyword search across headline/bio and the related user's name.
  if (q) {
    const tokens = q.split(/\s+/).filter(Boolean)
    const { docs: userDocs } = await payload.find({
      collection: 'users',
      where: {
        and: [
          { accountType: { equals: 'tutor' } },
          ...tokens.map((tok: string) => ({
            or: [{ firstName: { like: tok } }, { lastName: { like: tok } }],
          })) as any,
        ],
      },
      limit: 200,
      depth: 0,
    })
    const userIds = userDocs.map((u: any) => u.id)

    const orClause: any[] = [{ headline: { like: q } }, { bio: { like: q } }]
    if (userIds.length > 0) {
      orClause.push({ user: { in: userIds } })
    }
    where.and.push({ or: orClause })
  }

  if (ratingParam) {
    where.and.push({ rating: { greater_than_equal: ratingParam } })
  }

  if (subjectIds.length > 0) {
    where.and.push({ subjects: { in: subjectIds } })
  }

  const mode = getParam('mode')
  if (mode) {
    where.and.push({ mode: { equals: mode } })
  }

  const type = getParam('type')
  if (type && typeof type === 'string') {
    where.and.push({ type: { in: [type] } })
  }

  // Experience
  const experience = Number(getParam('experience'))
  if (experience) {
    where.and.push({ yearsOfExperience: { greater_than_equal: experience } })
  }

  const sort = getParam('sort') || '-rating'

  const {
    docs: tutorDocs,
    totalDocs,
    hasNextPage,
  } = await payload.find({
    collection: 'tutor-profiles',
    where,
    limit: 10,
    page,
    sort,
    depth: 2,
  })

  const tutors = tutorDocs.map((doc: any) => {
    const user = doc.user
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonymous Tutor'

    return {
      id: doc.id,
      slug: doc.slug,
      name: fullName,
      pricePerHour: doc.hourlyRate || 0,
      rating: doc.rating || 0,
      reviewCount: doc.totalReviews || 0,
      description: doc.bio
        ? doc.bio.length > 150
          ? doc.bio.substring(0, 150) + '...'
          : doc.bio
        : 'Professional Tutor',
      tags: doc.subjects?.map((s: any) => s.name?.toUpperCase()) || [],
      imageUrl: user?.avatar?.url || '/user-placeholder.png',
      isVerified: doc.isApproved || false,
      mode: doc.mode,
      type: doc.type,
    }
  })

  return { tutors, totalDocs, hasNextPage }
}

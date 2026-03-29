import type {
  CollectionConfig,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from 'payload'

const updateTutorRating = async ({ doc, req }: { doc: any; req: any }) => {
  if (!doc?.tutor) return

  const tutorId = typeof doc.tutor === 'object' ? doc.tutor.id : doc.tutor

  try {
    const reviews = await req.payload.find({
      collection: 'reviews',
      where: { tutor: { equals: tutorId } },
      limit: 1000,
      req,
    })

    const totalReviews = reviews.totalDocs
    const averageRating =
      totalReviews > 0
        ? reviews.docs.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / totalReviews
        : 0

    await req.payload.update({
      collection: 'tutor-profiles',
      id: tutorId,
      data: {
        totalReviews,
        rating: Math.round(averageRating * 10) / 10,
      },
      req,
    })
  } catch (error) {
    req.payload.logger.error(`Failed to update ratings for tutor: ${tutorId}`)
  }
}

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['tutor', 'user', 'rating', 'createdAt'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [updateTutorRating as CollectionAfterChangeHook],
    afterDelete: [updateTutorRating as CollectionAfterDeleteHook],
  },
  fields: [
    {
      name: 'review',
      type: 'textarea',
      required: true,
    },
    {
      name: 'rating',
      type: 'number',
      min: 1,
      max: 5,
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
    },
    {
      name: 'tutor',
      type: 'relationship',
      relationTo: 'tutor-profiles',
      required: true,
      hasMany: false,
    },
    {
      name: 'tutorResponse',
      type: 'textarea',
      required: false,
    },
  ],
  timestamps: true,
}

import type {
  CollectionConfig,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from 'payload'

const updateTutorRating = async ({ doc, req }: { doc: any; req: any }) => {
  if (!doc?.tutor) return

  const tutorId = typeof doc.tutor === 'object' ? doc.tutor.id : doc.tutor

  try {
    // Only approved reviews count toward the public rating / review count.
    const reviews = await req.payload.find({
      collection: 'reviews',
      where: {
        and: [{ tutor: { equals: tutorId } }, { isApproved: { equals: true } }],
      },
      limit: 1000,
      overrideAccess: true,
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
    defaultColumns: ['tutor', 'user', 'rating', 'isApproved', 'createdAt'],
  },
  access: {
    // Public can see approved reviews; admins/owners see all.
    read: ({ req: { user } }) => {
      if (user?.accountType === 'admin') return true
      if (!user) return { isApproved: { equals: true } } as any
      return {
        or: [{ isApproved: { equals: true } }, { user: { equals: user.id } }],
      } as any
    },
    create: ({ req: { user } }) =>
      Boolean(user && (user.accountType === 'student' || user.accountType === 'parent' || user.accountType === 'admin')),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      // Author can edit own review; tutor can add a tutorResponse (enforced at API).
      return {
        or: [{ user: { equals: user.id } }, { 'tutor.user': { equals: user.id } }],
      } as any
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { user: { equals: user.id } } as any
    },
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
      minLength: 10,
      maxLength: 2000,
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
      index: true,
    },
    {
      name: 'tutor',
      type: 'relationship',
      relationTo: 'tutor-profiles',
      required: true,
      hasMany: false,
      index: true,
    },
    {
      name: 'class',
      type: 'relationship',
      relationTo: 'classes',
      hasMany: false,
      admin: { description: 'Class this review is about (when applicable).' },
    },
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
      hasMany: false,
      admin: { description: 'Booking this review is about (when applicable).' },
    },
    {
      name: 'tutorResponse',
      type: 'textarea',
      required: false,
      maxLength: 2000,
    },
    {
      name: 'isApproved',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description: 'Admin moderation flag. Only approved reviews are visible publicly.',
      },
      access: {
        update: ({ req: { user } }) => Boolean(user?.accountType === 'admin'),
      },
    },
    {
      name: 'flagged',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Set when a user reports this review for moderation.' },
    },
  ],
  timestamps: true,
}

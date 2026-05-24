import type { CollectionConfig } from 'payload'

const accessibleWhiteboardIds = async (req: any): Promise<(string | number)[]> => {
  const { user, payload } = req
  if (!user) return []
  if (user.accountType === 'tutor') {
    const owned = await payload.find({
      collection: 'whiteboards',
      where: { owner: { equals: user.id } },
      limit: 1000,
      depth: 0,
    })
    return owned.docs.map((w: any) => w.id)
  }
  if (user.accountType === 'student') {
    const studentClasses = await payload.find({
      collection: 'classes',
      where: { students: { equals: user.id } },
      limit: 100,
      depth: 0,
    })
    const classIds = studentClasses.docs.map((c: any) => c.id)
    const boards = await payload.find({
      collection: 'whiteboards',
      where: { or: [{ class: { in: classIds } }, { isPublic: { equals: true } }] },
      limit: 1000,
      depth: 0,
    })
    return boards.docs.map((w: any) => w.id)
  }
  if (user.accountType === 'parent') {
    const parentClasses = await payload.find({
      collection: 'classes',
      where: { parents: { equals: user.id } },
      limit: 100,
      depth: 0,
    })
    const classIds = parentClasses.docs.map((c: any) => c.id)
    const boards = await payload.find({
      collection: 'whiteboards',
      where: { or: [{ class: { in: classIds } }, { isPublic: { equals: true } }] },
      limit: 1000,
      depth: 0,
    })
    return boards.docs.map((w: any) => w.id)
  }
  return []
}

export const WhiteboardSlides: CollectionConfig = {
  slug: 'whiteboard-slides',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['whiteboard', 'order', 'updatedAt'],
  },
  access: {
    read: async ({ req }) => {
      if (!req.user) return false
      if (req.user.accountType === 'admin') return true
      const ids = await accessibleWhiteboardIds(req)
      return { whiteboard: { in: ids } } as any
    },
    create: ({ req: { user } }) =>
      Boolean(user && (user.accountType === 'tutor' || user.accountType === 'admin')),
    update: async ({ req }) => {
      if (!req.user) return false
      if (req.user.accountType === 'admin') return true
      if (req.user.accountType !== 'tutor') return false
      const ids = await accessibleWhiteboardIds(req)
      return { whiteboard: { in: ids } } as any
    },
    delete: async ({ req }) => {
      if (!req.user) return false
      if (req.user.accountType === 'admin') return true
      if (req.user.accountType !== 'tutor') return false
      const ids = await accessibleWhiteboardIds(req)
      return { whiteboard: { in: ids } } as any
    },
  },
  fields: [
    {
      name: 'whiteboard',
      type: 'relationship',
      relationTo: 'whiteboards',
      required: true,
      index: true,
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 0,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'data',
      type: 'json',
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
    },
  ],
  timestamps: true,
}

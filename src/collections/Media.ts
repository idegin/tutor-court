import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { uploadedBy: { equals: user.id } } as any
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.accountType === 'admin') return true
      return { uploadedBy: { equals: user.id } } as any
    },
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user && !data?.uploadedBy) {
          data.uploadedBy = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      index: true,
      admin: { readOnly: true, description: 'Auto-populated from the authenticated uploader.' },
    },
    {
      name: 'purpose',
      type: 'select',
      options: [
        { label: 'Avatar', value: 'avatar' },
        { label: 'Whiteboard / Class Asset', value: 'class_asset' },
        { label: 'Assessment Question', value: 'assessment_question' },
        { label: 'Identity Document', value: 'identity_document' },
        { label: 'Certification', value: 'certification' },
        { label: 'Class Material', value: 'class_material' },
        { label: 'General', value: 'general' },
      ],
      defaultValue: 'general',
      index: true,
    },
  ],
  upload: {
    adminThumbnail: 'thumbnail',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
        height: 300,
      },
      { name: 'card', width: 640, height: 480 },
    ],
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
}

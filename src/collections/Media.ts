import type { CollectionConfig } from 'payload'

import { hasRole, isAdminOrEditor, isStaff } from '@/access'

const httpUrlOnly = (value: string | null | undefined): true | string => {
  if (!value) return true
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:' || 'La URL debe usar http o https'
  } catch {
    return 'URL no válida'
  }
}

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'credit', 'uploadedBy'],
  },
  access: {
    read: () => true,
    create: isStaff,
    update: ({ req }) => {
      if (hasRole(req.user, 'admin', 'editor')) return true
      if (req.user && hasRole(req.user, 'journalist')) {
        return { uploadedBy: { equals: req.user.id } }
      }
      return false
    },
    delete: isAdminOrEditor,
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'caption', type: 'text' },
    { name: 'credit', type: 'text' },
    { name: 'sourceUrl', type: 'text', validate: httpUrlOnly },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true, position: 'sidebar' },
      access: {
        read: ({ req }) => hasRole(req.user, 'admin', 'editor', 'journalist'),
      },
      hooks: {
        beforeChange: [
          ({ operation, req, previousValue }) =>
            operation === 'create' ? (req.user?.id ?? undefined) : previousValue,
        ],
      },
    },
  ],
}

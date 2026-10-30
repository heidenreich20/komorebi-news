import type { CollectionConfig } from 'payload'

import { hasRole, isAdmin, isAdminOrEditor } from '@/access'
import { slugField } from '@/fields/slug'
import { httpUrlOnly } from '@/fields/validators'

export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'slug', 'isActive'],
  },
  access: {
    read: ({ req }) =>
      hasRole(req.user, 'admin', 'editor') ? true : { isActive: { equals: true } },
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    { name: 'displayName', type: 'text', required: true },
    slugField('displayName'),
    { name: 'biography', type: 'textarea' },
    { name: 'portrait', type: 'upload', relationTo: 'media' },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true, validate: httpUrlOnly },
      ],
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
}

import type { CollectionConfig } from 'payload'

import { hasRole, isAdmin, isAdminOrEditor } from '@/access'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'displayOrder', 'isActive'],
  },
  access: {
    read: ({ req }) =>
      hasRole(req.user, 'admin', 'editor') ? true : { isActive: { equals: true } },
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    { name: 'description', type: 'textarea' },
    { name: 'displayOrder', type: 'number', defaultValue: 0 },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
}

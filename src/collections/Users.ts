import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { adminOrFirstUser, adminOrSelf, hasRole, isAdmin, isAdminField, noUsersYet } from '@/access'

const firstUserBecomesAdmin: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if (await noUsersYet(req)) return { ...data, role: 'admin', active: true }
  return data
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'active'],
  },
  auth: true,
  access: {
    admin: ({ req }) => hasRole(req.user, 'admin', 'editor', 'journalist'),
    create: isAdmin,
    read: adminOrSelf,
    update: adminOrSelf,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [firstUserBecomesAdmin],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'journalist',
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Periodista', value: 'journalist' },
      ],
      access: { create: adminOrFirstUser, update: isAdminField },
      admin: { position: 'sidebar' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      access: { create: adminOrFirstUser, update: isAdminField },
      admin: { position: 'sidebar' },
    },
  ],
}

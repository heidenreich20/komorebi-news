import {
  AuthenticationError,
  type CollectionAfterChangeHook,
  type CollectionBeforeLoginHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from 'payload'

import { adminOrFirstUser, adminOrSelf, hasRole, isAdmin, isAdminField, noUsersYet } from '@/access'
import type { User } from '@/payload-types'

const firstUserBecomesAdmin: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if (await noUsersYet(req)) return { ...data, role: 'admin', active: true }
  return data
}

const rejectInactiveLogin: CollectionBeforeLoginHook<User> = ({ req, user }) => {
  if (user.active === false) {
    throw new AuthenticationError(req.t)
  }

  return user
}

const revokeSessionsOnDeactivation: CollectionAfterChangeHook<User> = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (operation !== 'update' || previousDoc.active !== true || doc.active !== false) {
    return doc
  }

  await req.payload.update({
    collection: 'users',
    id: doc.id,
    data: { sessions: [] },
    overrideAccess: true,
    req,
  })

  return doc
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'active'],
  },
  auth: {
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
  },
  access: {
    admin: ({ req }) => hasRole(req.user, 'admin', 'editor', 'journalist'),
    create: isAdmin,
    read: adminOrSelf,
    update: adminOrSelf,
    delete: isAdmin,
  },
  hooks: {
    beforeLogin: [rejectInactiveLogin],
    afterChange: [revokeSessionsOnDeactivation],
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

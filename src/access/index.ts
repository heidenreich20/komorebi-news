import type { Access, FieldAccess, PayloadRequest } from 'payload'

import type { User } from '@/payload-types'

type Role = NonNullable<User['role']>

export const hasRole = (user: User | null | undefined, ...roles: Role[]): boolean =>
  Boolean(user && user.active !== false && user.role && roles.includes(user.role))

export const isAdmin: Access = ({ req }) => hasRole(req.user, 'admin')

export const isAdminOrEditor: Access = ({ req }) => hasRole(req.user, 'admin', 'editor')

export const isStaff: Access = ({ req }) => hasRole(req.user, 'admin', 'editor', 'journalist')

export const isAdminField: FieldAccess = ({ req }) => hasRole(req.user, 'admin')

export const adminOrSelf: Access = ({ req }) => {
  const user = req.user
  if (!user) return false
  if (hasRole(user, 'admin')) return true
  if (hasRole(user, 'editor', 'journalist')) return { id: { equals: user.id } }
  return false
}

// True when the users collection is still empty (bootstrap of the first administrator).
export const noUsersYet = async (req: PayloadRequest): Promise<boolean> => {
  const { totalDocs } = await req.payload.count({ collection: 'users', req })
  return totalDocs === 0
}

// Field access for `role` and `active` on create: admins, or nobody signed in while no users exist.
export const adminOrFirstUser: FieldAccess = async ({ req }) =>
  hasRole(req.user, 'admin') || (!req.user && (await noUsersYet(req)))

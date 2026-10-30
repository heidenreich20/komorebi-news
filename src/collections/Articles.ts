import type { CollectionConfig, Where } from 'payload'

import { hasRole, isAdmin, isAdminOrEditor, isAdminOrEditorField, isStaff } from '@/access'
import { slugField } from '@/fields/slug'

export const publiclyVisible = (): Where => ({
  and: [
    {
      or: [
        { editorialStatus: { equals: 'published' } },
        { editorialStatus: { equals: 'scheduled' } },
      ],
    },
    { publishedAt: { less_than_equal: new Date().toISOString() } },
  ],
})

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'editorialStatus', 'author', 'publishedAt'],
  },
  versions: { maxPerDoc: 50 },
  access: {
    read: ({ req }) => {
      if (hasRole(req.user, 'admin', 'editor')) return true
      if (req.user && hasRole(req.user, 'journalist')) {
        return { or: [publiclyVisible(), { createdBy: { equals: req.user.id } }] }
      }
      return publiclyVisible()
    },
    create: isStaff,
    update: ({ req }) => {
      if (hasRole(req.user, 'admin', 'editor')) return true
      if (req.user && hasRole(req.user, 'journalist')) {
        const ownDraftsOnly: Where = {
          and: [
            { createdBy: { equals: req.user.id } },
            { editorialStatus: { in: ['draft', 'rejected'] } },
          ],
        }
        return ownDraftsOnly
      }
      return false
    },
    delete: isAdmin,
    readVersions: isAdminOrEditor,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    { name: 'excerpt', type: 'textarea' },
    { name: 'body', type: 'richText' },
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      required: true,
    },
    { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true },
    { name: 'author', type: 'relationship', relationTo: 'authors', required: true },
    {
      name: 'editorialStatus',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Borrador', value: 'draft' },
        { label: 'En revisión', value: 'in_review' },
        { label: 'Programado', value: 'scheduled' },
        { label: 'Publicado', value: 'published' },
        { label: 'Rechazado', value: 'rejected' },
        { label: 'Archivado', value: 'archived' },
      ],
      access: { create: isAdminOrEditorField, update: isAdminOrEditorField },
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      access: { create: isAdminOrEditorField, update: isAdminOrEditorField },
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'createdBy',
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

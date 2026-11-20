import type { CollectionConfig, Where } from 'payload'

import {
  hasRole,
  isAdmin,
  isAdminOrEditor,
  isAdminOrEditorField,
  isStaff,
  isStaffField,
} from '@/access'
import { slugField } from '@/fields/slug'
import { enforceStatusTransitions } from '@/hooks/enforceStatusTransitions'
import { enforcePublicationRules } from '@/hooks/enforcePublicationRules'
import { guardArticleSlugRedirects } from '@/hooks/guardArticleSlugRedirects'
import { createArticleSlugRedirect } from '@/hooks/createArticleSlugRedirect'
import { stampEditorialUpdate } from '@/hooks/stampEditorialUpdate'

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
  hooks: {
    beforeValidate: [enforceStatusTransitions, enforcePublicationRules, guardArticleSlugRedirects],
    beforeChange: [stampEditorialUpdate],
    afterChange: [createArticleSlugRedirect],
    beforeOperation: [
      ({ operation, req }) => {
        if (operation === 'restoreVersion' && hasRole(req.user, 'journalist')) {
          throw new Error('Los periodistas no tienen permitido restaurar versiones.')
        }
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    { name: 'excerpt', type: 'textarea', maxLength: 300 },
    { name: 'body', type: 'richText' },
    {
      name: 'seoTitle',
      type: 'text',
      maxLength: 70,
      access: { create: isStaffField, update: isStaffField },
      admin: { description: 'Título para buscadores. Si queda vacío, se usa el título del artículo.' },
    },
    {
      name: 'seoDescription',
      type: 'textarea',
      maxLength: 160,
      access: { create: isStaffField, update: isStaffField },
      admin: { description: 'Descripción para buscadores. Si queda vacía, se usa el resumen.' },
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
      access: { create: isAdminOrEditorField, update: isAdminOrEditorField },
      admin: { position: 'sidebar' },
    },
    {
      name: 'updatedAtEditorial',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'correctionNote',
      type: 'textarea',
      maxLength: 1000,
      access: { create: isAdminOrEditorField, update: isAdminOrEditorField },
      admin: { description: 'Nota pública de corrección; se muestra junto al artículo.' },
    },
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
      access: { create: isAdminOrEditorField, update: isStaffField },
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

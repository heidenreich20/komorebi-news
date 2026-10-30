import type { Field, FieldHook } from 'payload'

export const formatSlug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents: "Economía" -> "Economia"
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Builds the slug from a source field when none is given; always normalizes what is stored.
const slugFromSource =
  (sourceField: string): FieldHook =>
  ({ value, data }) => {
    const raw = typeof value === 'string' && value.trim() ? value : data?.[sourceField]
    return typeof raw === 'string' ? formatSlug(raw) : value
  }

export const slugField = (sourceField: string): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: { position: 'sidebar' },
  hooks: { beforeValidate: [slugFromSource(sourceField)] },
})

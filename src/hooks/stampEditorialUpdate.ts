import type { CollectionBeforeChangeHook } from 'payload'

import type { Article } from '@/payload-types'

const EDITORIAL_FIELDS: (keyof Article)[] = [
  'title',
  'slug',
  'excerpt',
  'body',
  'featuredImage',
  'categories',
  'tags',
  'author',
  'seoTitle',
  'seoDescription',
  'isFeatured',
  'correctionNote',
]

export const stampEditorialUpdate: CollectionBeforeChangeHook<Article> = ({
  data,
  operation,
  originalDoc,
}) => {
  if (!data) return data

  if (operation === 'create') {
    return { ...data, updatedAtEditorial: null }
  }

  const hasEditorialChange = EDITORIAL_FIELDS.some((field) => data[field] !== undefined)

  return {
    ...data,
    // Ignore client-supplied values: this timestamp is maintained by the server.
    updatedAtEditorial: hasEditorialChange
      ? new Date().toISOString()
      : (originalDoc?.updatedAtEditorial ?? null),
  }
}

import type { CollectionBeforeChangeHook } from 'payload'

import type { Article } from '@/payload-types'

export const stampEditorialUpdate: CollectionBeforeChangeHook<Article> = ({
  data,
  operation,
}) => {
  if (!data) return data

  // This is server-maintained and cannot be overridden by API clients.
  return {
    ...data,
    updatedAtEditorial: operation === 'create' ? null : new Date().toISOString(),
  }
}

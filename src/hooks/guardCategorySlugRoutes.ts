import { APIError, type CollectionBeforeValidateHook } from 'payload'

import { formatSlug } from '@/fields/slug'
import { isReservedRootSlug } from '@/fields/reservedRootSlugs'
import type { Category } from '@/payload-types'

export const guardCategorySlugRoutes: CollectionBeforeValidateHook<Category> = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) return data

  const rawSlug =
    operation === 'create'
      ? typeof data.slug === 'string' && data.slug.trim()
        ? data.slug
        : typeof data.name === 'string'
          ? data.name
          : undefined
      : typeof data.slug === 'string' && data.slug.trim()
        ? data.slug
        : undefined

  if (typeof rawSlug !== 'string') return data

  const candidateSlug = formatSlug(rawSlug)
  if (!candidateSlug || candidateSlug === originalDoc?.slug) return data

  if (isReservedRootSlug(candidateSlug)) {
    throw new APIError('Ese slug está reservado para una ruta del sitio.', 409)
  }

  const article = await req.payload.find({
    collection: 'articles',
    where: { slug: { equals: candidateSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (article.totalDocs > 0) {
    throw new APIError('Ese slug ya está reservado por un artículo.', 409)
  }

  const redirect = await req.payload.find({
    collection: 'redirects',
    where: { fromPath: { equals: `/${candidateSlug}` } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (redirect.totalDocs > 0) {
    throw new APIError('Ese slug está reservado por una URL anterior de artículo.', 409)
  }

  return data
}

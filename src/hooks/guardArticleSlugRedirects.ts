import { APIError, type CollectionBeforeValidateHook } from 'payload'

import { formatSlug } from '@/fields/slug'
import type { Article } from '@/payload-types'
import { isReservedRootSlug } from '@/fields/reservedRootSlugs'

export const guardArticleSlugRedirects: CollectionBeforeValidateHook<Article> = async ({
  data,
  operation,
  req,
}) => {
  if (!data) return data

  // The slug field generates a value from the title on creation. On updates,
  // only an explicitly submitted slug can change the public URL.
  const rawSlug =
    operation === 'create'
      ? typeof data.slug === 'string' && data.slug.trim()
        ? data.slug
        : typeof data.title === 'string'
          ? data.title
          : undefined
      : typeof data.slug === 'string' && data.slug.trim()
        ? data.slug
        : undefined

  if (typeof rawSlug !== 'string') return data

  const candidateSlug = formatSlug(rawSlug)
  if (!candidateSlug) return data

  if (isReservedRootSlug(candidateSlug)) {
    throw new APIError('Ese slug está reservado para una ruta del sitio.', 409)
  }

  const category = await req.payload.find({
    collection: 'categories',
    where: { slug: { equals: candidateSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (category.totalDocs > 0) {
    throw new APIError('Ese slug ya está reservado por una categoría.', 409)
  }

  const existingRedirect = await req.payload.find({
    collection: 'redirects',
    where: { fromPath: { equals: `/${candidateSlug}` } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (existingRedirect.totalDocs > 0) {
    throw new APIError(
      'Ese slug ya está reservado porque es la URL anterior de otro artículo. Elegí uno diferente.',
      409,
    )
  }

  return data
}

import { APIError, type CollectionBeforeValidateHook } from 'payload'

import { formatSlug } from '@/fields/slug'
import type { Article } from '@/payload-types'

export const guardArticleSlugRedirects: CollectionBeforeValidateHook<Article> = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) return data

  // On updates, only an explicit slug change should be checked. A title edit
  // does not implicitly replace an existing slug.
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
  if (!candidateSlug || (operation === 'update' && candidateSlug === originalDoc?.slug)) {
    return data
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

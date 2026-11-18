import type { CollectionAfterChangeHook } from 'payload'

import type { Article } from '@/payload-types'

const wasPublic = (article: Article): boolean => {
  if (article.editorialStatus !== 'published' && article.editorialStatus !== 'scheduled') {
    return false
  }

  return Boolean(article.publishedAt && new Date(article.publishedAt).getTime() <= Date.now())
}

export const createArticleSlugRedirect: CollectionAfterChangeHook<Article> = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (operation !== 'update' || !previousDoc || previousDoc.slug === doc.slug) return doc
  // Redirect only when the old URL was public and the new URL remains public.
  // Archiving or unpublishing must not redirect readers to another unavailable page.
  if (!wasPublic(previousDoc) || !wasPublic(doc)) return doc

  const fromPath = `/${previousDoc.slug}`
  const toPath = `/${doc.slug}`

  // Keep older URLs pointing directly to the newest slug, avoiding redirect chains.
  await req.payload.update({
    collection: 'redirects',
    where: { toPath: { equals: fromPath } },
    data: { toPath },
    overrideAccess: true,
    req,
  })

  const existing = await req.payload.find({
    collection: 'redirects',
    where: { fromPath: { equals: fromPath } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (existing.docs[0]) {
    await req.payload.update({
      collection: 'redirects',
      id: existing.docs[0].id,
      data: { toPath, statusCode: '308' },
      overrideAccess: true,
      req,
    })
  } else {
    await req.payload.create({
      collection: 'redirects',
      data: { fromPath, toPath, statusCode: '308' },
      overrideAccess: true,
      req,
    })
  }

  return doc
}

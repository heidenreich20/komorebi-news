import type { Payload, Where } from 'payload'

import { publiclyVisible } from '@/collections/Articles'

const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 12
const ARTICLE_DEPTH = 2

export type PublicArticleQueryOptions = {
  page?: number
  limit?: number
  categorySlug?: string
  featuredOnly?: boolean
}

const positiveInteger = (value: number | undefined, fallback: number, max = Number.MAX_SAFE_INTEGER) =>
  typeof value === 'number' && Number.isInteger(value) && value > 0
    ? Math.min(value, max)
    : fallback

/**
 * Public read-model queries for server components and route handlers.
 *
 * These functions deliberately keep Payload access control enabled. The
 * collection access rules remain the final authority for public visibility.
 */
export async function getPublicArticles(payload: Payload, options: PublicArticleQueryOptions = {}) {
  const page = positiveInteger(options.page, 1)
  const limit = positiveInteger(options.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

  const clauses: Where[] = [publiclyVisible()]

  if (options.featuredOnly) {
    clauses.push({ isFeatured: { equals: true } })
  }

  if (options.categorySlug) {
    const category = await payload.find({
      collection: 'categories',
      where: { slug: { equals: options.categorySlug } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
    })

    const activeCategory = category.docs[0]
    if (!activeCategory) {
      return {
        docs: [],
        totalDocs: 0,
        limit,
        totalPages: 0,
        page,
        pagingCounter: 0,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      }
    }

    clauses.push({ categories: { contains: activeCategory.id } })
  }

  return payload.find({
    collection: 'articles',
    where: { and: clauses },
    sort: '-publishedAt',
    page,
    limit,
    depth: ARTICLE_DEPTH,
    overrideAccess: false,
  })
}

export async function getPublicArticleBySlug(payload: Payload, slug: string) {
  const result = await payload.find({
    collection: 'articles',
    where: {
      and: [publiclyVisible(), { slug: { equals: slug } }],
    },
    limit: 1,
    depth: ARTICLE_DEPTH,
    overrideAccess: false,
  })

  return result.docs[0] ?? null
}

export async function getPublicCategories(payload: Payload) {
  const result = await payload.find({
    collection: 'categories',
    where: { isActive: { equals: true } },
    sort: 'displayOrder',
    limit: 100,
    depth: 1,
    overrideAccess: false,
  })

  return result.docs
}

export async function getPublicCategoryBySlug(payload: Payload, slug: string) {
  const result = await payload.find({
    collection: 'categories',
    where: { and: [{ slug: { equals: slug } }, { isActive: { equals: true } }] },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })

  return result.docs[0] ?? null
}

/**
 * Redirects are editorially managed, but their lookup is intentionally public.
 * Only the exact source path is selected and only routing fields are returned.
 */
export async function getPublicRedirect(payload: Payload, fromPath: string) {
  if (!/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fromPath)) return null

  const result = await payload.find({
    collection: 'redirects',
    where: { fromPath: { equals: fromPath } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const redirect = result.docs[0]
  if (!redirect) return null

  return {
    toPath: redirect.toPath,
    statusCode: Number(redirect.statusCode) as 301 | 308,
  }
}

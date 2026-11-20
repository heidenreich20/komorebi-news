// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Author, Category, Media, User } from '@/payload-types'
import {
  getPublicArticleBySlug,
  getPublicArticles,
  getPublicCategories,
  getPublicCategoryBySlug,
  getPublicRedirect,
} from '@/lib/publicContent'

import { lexicalBody, pngBytes } from '../helpers/articleFixtures'

let payload: Payload
let editor: User
let category: Category
let inactiveCategory: Category
let author: Author
let media: Media

const makeUser = () =>
  payload.create({
    collection: 'users',
    data: { email: 'public-content-editor@test.local', password: 'test-password-123', name: 'Editor', role: 'editor' },
  })

const createArticle = (title: string, isFeatured = false) =>
  payload.create({
    collection: 'articles',
    data: {
      title,
      slug: '',
      categories: [category.id],
      author: author.id,
      excerpt: 'Resumen público de prueba',
      body: lexicalBody('Contenido público de prueba'),
      featuredImage: media.id,
      isFeatured,
    } as never,
    user: editor,
    overrideAccess: false,
    depth: 0,
  })

const publish = async (id: number) => {
  await payload.update({
    collection: 'articles',
    id,
    data: { editorialStatus: 'in_review' },
    user: editor,
    overrideAccess: false,
    depth: 0,
  })
  return payload.update({
    collection: 'articles',
    id,
    data: { editorialStatus: 'published' },
    user: editor,
    overrideAccess: false,
    depth: 0,
  })
}

describe('Public content queries', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    await payload.delete({ collection: 'redirects', where: { id: { exists: true } } })
    await payload.delete({ collection: 'articles', where: { id: { exists: true } } })
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
    await payload.delete({ collection: 'authors', where: { id: { exists: true } } })
    await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
    await payload.delete({ collection: 'users', where: { id: { exists: true } } })

    editor = await makeUser()
    category = await payload.create({
      collection: 'categories',
      data: { name: 'Política', slug: 'politica', isActive: true },
    })
    inactiveCategory = await payload.create({
      collection: 'categories',
      data: { name: 'Inactiva', slug: 'inactiva', isActive: false },
    })
    author = await payload.create({
      collection: 'authors',
      data: { displayName: 'Redacción', slug: 'redaccion' },
    })
    media = await payload.create({
      collection: 'media',
      data: { alt: 'Imagen de prueba' },
      file: { data: pngBytes, mimetype: 'image/png', name: 'public-content.png', size: pngBytes.length },
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'redirects', where: { id: { exists: true } } })
    await payload.delete({ collection: 'articles', where: { id: { exists: true } } })
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
    await payload.delete({ collection: 'authors', where: { id: { exists: true } } })
    await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
    await payload.delete({ collection: 'users', where: { id: { exists: true } } })
  })

  it('returns only currently public articles and supports featured/category filters', async () => {
    const featured = await createArticle('Artículo destacado', true)
    await publish(featured.id)
    const ordinary = await createArticle('Artículo normal')
    await publish(ordinary.id)
    const draft = await createArticle('Borrador privado')

    const all = await getPublicArticles(payload)
    expect(all.docs.map((article) => article.slug)).toEqual(
      expect.arrayContaining([featured.slug, ordinary.slug]),
    )
    expect(all.docs.some((article) => article.id === draft.id)).toBe(false)

    const featuredOnly = await getPublicArticles(payload, { featuredOnly: true })
    expect(featuredOnly.docs.map((article) => article.id)).toContain(featured.id)
    expect(featuredOnly.docs.map((article) => article.id)).not.toContain(ordinary.id)

    const byCategory = await getPublicArticles(payload, { categorySlug: 'politica' })
    expect(byCategory.docs.map((article) => article.id)).toEqual(
      expect.arrayContaining([featured.id, ordinary.id]),
    )
    const unknownCategory = await getPublicArticles(payload, { categorySlug: 'no-existe' })
    expect(unknownCategory.totalDocs).toBe(0)
  })

  it('does not expose future scheduled articles by slug or in lists', async () => {
    const scheduled = await createArticle('Artículo programado')
    await payload.update({
      collection: 'articles',
      id: scheduled.id,
      data: { editorialStatus: 'in_review' },
      user: editor,
      overrideAccess: false,
      depth: 0,
    })
    await payload.update({
      collection: 'articles',
      id: scheduled.id,
      data: {
        editorialStatus: 'scheduled',
        publishedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      user: editor,
      overrideAccess: false,
      depth: 0,
    })

    expect(await getPublicArticleBySlug(payload, scheduled.slug)).toBeNull()
    const list = await getPublicArticles(payload)
    expect(list.docs.some((article) => article.id === scheduled.id)).toBe(false)
  })

  it('returns only active public categories', async () => {
    const categories = await getPublicCategories(payload)
    expect(categories.map((item) => item.slug)).toContain(category.slug)
    expect(categories.map((item) => item.slug)).not.toContain(inactiveCategory.slug)

    expect(await getPublicCategoryBySlug(payload, category.slug)).not.toBeNull()
    expect(await getPublicCategoryBySlug(payload, inactiveCategory.slug)).toBeNull()
  })

  it('resolves only valid exact redirect paths and returns routing fields only', async () => {
    await payload.create({
      collection: 'redirects',
      data: { fromPath: '/articulo-antiguo', toPath: '/articulo-nuevo', statusCode: '308' },
      overrideAccess: true,
    })

    expect(await getPublicRedirect(payload, '/articulo-antiguo')).toEqual({
      toPath: '/articulo-nuevo',
      statusCode: 308,
    })
    expect(await getPublicRedirect(payload, '/no-existe')).toBeNull()
    expect(await getPublicRedirect(payload, '//articulo-antiguo')).toBeNull()
    expect(await getPublicRedirect(payload, 'https://example.com/articulo-antiguo')).toBeNull()
  })
})

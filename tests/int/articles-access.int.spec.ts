// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Article, Author, Category, User } from '@/payload-types'

const password = 'test-password-123'
const PAST = '2020-01-01T00:00:00.000Z'
const FUTURE = '2999-01-01T00:00:00.000Z'

type Status = Article['editorialStatus']

let payload: Payload
let admin: User
let editor: User
let journalist: User
let otherJournalist: User
let category: Category
let author: Author

const makeUser = (email: string, name: string, role: 'admin' | 'editor' | 'journalist') =>
  payload.create({ collection: 'users', data: { email, password, name, role } })

// slug is left empty on purpose: the field hook must build it from the title.
const make = (
  user: User,
  title: string,
  extra: { editorialStatus?: Status; publishedAt?: string; createdBy?: number } = {},
) =>
  payload.create({
    collection: 'articles',
    // Cast: tests deliberately omit `editorialStatus` to check the server-side default.
    data: {
      title,
      slug: '',
      categories: [category.id],
      author: author.id,
      ...extra,
    } as never,
    user,
    overrideAccess: false,
    depth: 0,
  })

const seed = (title: string, extra: { editorialStatus?: Status; publishedAt?: string } = {}) =>
  payload.create({
    collection: 'articles',
    data: { title, slug: '', categories: [category.id], author: author.id, ...extra } as never,
    depth: 0,
  })

const idOf = (value: unknown): unknown =>
  value && typeof value === 'object' ? (value as { id: unknown }).id : value

const cleanArticles = () =>
  payload.delete({ collection: 'articles', where: { id: { exists: true } } })

describe('Articles', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // Safe: vitest.setup.ts guarantees this is the throwaway test database.
    await cleanArticles()
    await payload.delete({ collection: 'authors', where: { id: { exists: true } } })
    await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
    await payload.delete({ collection: 'users', where: { id: { exists: true } } })

    admin = await makeUser('admin@test.local', 'Admin', 'admin')
    editor = await makeUser('editor@test.local', 'Editor', 'editor')
    journalist = await makeUser('journalist@test.local', 'Journalist', 'journalist')
    otherJournalist = await makeUser('other@test.local', 'Other', 'journalist')
    category = await payload.create({
      collection: 'categories',
      data: { name: 'K-pop', slug: '' },
    })
    author = await payload.create({
      collection: 'authors',
      data: { displayName: 'Redacción', slug: '' },
    })
  })

  // Articles reference authors, so they must go before the other specs delete authors.
  afterAll(async () => {
    await cleanArticles()
  })

  it('lets a journalist create an article: draft, owned by them, slug from the title', async () => {
    const created = await make(journalist, 'Debut de un grupo nuevo')
    expect(created.editorialStatus).toBe('draft')
    expect(idOf(created.createdBy)).toBe(journalist.id)
    expect(created.slug).toBe('debut-de-un-grupo-nuevo')
  })

  it('does not let a journalist set the editorial status or publication date', async () => {
    const created = await make(journalist, 'Intento de publicar', {
      editorialStatus: 'published',
      publishedAt: PAST,
    })
    expect(created.editorialStatus).toBe('draft')
    expect(created.publishedAt ?? null).toBeNull()
  })

  it('does not let a client choose createdBy', async () => {
    const created = await make(journalist, 'Autoría falsa', { createdBy: admin.id })
    expect(idOf(created.createdBy)).toBe(journalist.id)
  })

  it('shows anonymous visitors only published or due-scheduled articles', async () => {
    await seed('Nota en borrador')
    await seed('Nota en revision', { editorialStatus: 'in_review', publishedAt: PAST })
    await seed('Nota rechazada', { editorialStatus: 'rejected', publishedAt: PAST })
    await seed('Nota archivada', { editorialStatus: 'archived', publishedAt: PAST })
    await seed('Nota publicada', { editorialStatus: 'published', publishedAt: PAST })
    await seed('Nota programada vencida', { editorialStatus: 'scheduled', publishedAt: PAST })
    await seed('Nota programada futura', { editorialStatus: 'scheduled', publishedAt: FUTURE })
    await seed('Nota publicada sin fecha', { editorialStatus: 'published' })

    const result = await payload.find({
      collection: 'articles',
      overrideAccess: false,
      limit: 100,
      depth: 0,
    })
    const slugs = result.docs.map((doc) => doc.slug).sort()
    expect(slugs).toEqual(['nota-programada-vencida', 'nota-publicada'])
  })

  it('shows a journalist their own articles plus public ones, never others’ drafts', async () => {
    await make(journalist, 'Borrador propio')
    await make(otherJournalist, 'Borrador ajeno')

    const result = await payload.find({
      collection: 'articles',
      user: journalist,
      overrideAccess: false,
      limit: 100,
      depth: 0,
    })
    const slugs = result.docs.map((doc) => doc.slug)
    expect(slugs).toContain('borrador-propio')
    expect(slugs).toContain('nota-publicada')
    expect(slugs).not.toContain('borrador-ajeno')
    expect(slugs).not.toContain('nota-en-borrador')
  })

  it('lets a journalist edit their own draft', async () => {
    const mine = await make(journalist, 'Para editar')
    const updated = await payload.update({
      collection: 'articles',
      id: mine.id,
      data: { excerpt: 'Resumen nuevo' },
      user: journalist,
      overrideAccess: false,
    })
    expect(updated.excerpt).toBe('Resumen nuevo')
  })

  it('rejects a journalist editing someone else’s draft', async () => {
    const theirs = await make(otherJournalist, 'De otra persona')
    await expect(
      payload.update({
        collection: 'articles',
        id: theirs.id,
        data: { excerpt: 'Intrusión' },
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('locks a journalist out of an article once it is in review', async () => {
    const mine = await make(journalist, 'Enviada a revision')
    await payload.update({
      collection: 'articles',
      id: mine.id,
      data: { editorialStatus: 'in_review' },
      user: editor,
      overrideAccess: false,
    })
    await expect(
      payload.update({
        collection: 'articles',
        id: mine.id,
        data: { excerpt: 'Cambio tardío' },
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('lets a journalist edit their article again after it is rejected', async () => {
    const mine = await make(journalist, 'Devuelta por el editor')
    for (const status of ['in_review', 'rejected'] as const) {
      await payload.update({
        collection: 'articles',
        id: mine.id,
        data: { editorialStatus: status },
        user: editor,
        overrideAccess: false,
      })
    }
    const updated = await payload.update({
      collection: 'articles',
      id: mine.id,
      data: { excerpt: 'Corregida' },
      user: journalist,
      overrideAccess: false,
    })
    expect(updated.excerpt).toBe('Corregida')
  })

  it('lets editors edit any article', async () => {
    const theirs = await make(otherJournalist, 'Editada por editor')
    const updated = await payload.update({
      collection: 'articles',
      id: theirs.id,
      data: { excerpt: 'Retocada' },
      user: editor,
      overrideAccess: false,
    })
    expect(updated.excerpt).toBe('Retocada')
  })

  it('lets only administrators delete articles', async () => {
    const target = await make(journalist, 'Para borrar')
    for (const user of [journalist, editor]) {
      await expect(
        payload.delete({
          collection: 'articles',
          id: target.id,
          user,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    }
    const deleted = await payload.delete({
      collection: 'articles',
      id: target.id,
      user: admin,
      overrideAccess: false,
    })
    expect(deleted.id).toBe(target.id)
  })

  it('keeps version history that only editors and admins can read', async () => {
    const mine = await make(journalist, 'Con historial')
    await payload.update({
      collection: 'articles',
      id: mine.id,
      data: { excerpt: 'Segunda versión' },
      user: editor,
      overrideAccess: false,
    })

    const versions = await payload.findVersions({
      collection: 'articles',
      where: { parent: { equals: mine.id } },
      user: editor,
      overrideAccess: false,
    })
    expect(versions.totalDocs).toBeGreaterThanOrEqual(1)

    await expect(
      payload.findVersions({
        collection: 'articles',
        where: { parent: { equals: mine.id } },
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('removes an article’s version history when the article is deleted', async () => {
    const target = await make(journalist, 'Historial a limpiar')
    await payload.update({
      collection: 'articles',
      id: target.id,
      data: { excerpt: 'Otra versión' },
      user: editor,
      overrideAccess: false,
    })
    await payload.delete({ collection: 'articles', id: target.id })

    const leftovers = await payload.findVersions({
      collection: 'articles',
      where: { parent: { equals: target.id } },
    })
    expect(leftovers.totalDocs).toBe(0)
  })

  it('does not allow deleting an author who still has articles', async () => {
    await expect(payload.delete({ collection: 'authors', id: author.id })).rejects.toThrow()
  })
})

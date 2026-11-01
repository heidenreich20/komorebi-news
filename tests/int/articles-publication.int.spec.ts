// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Author, Category, Media, User } from '@/payload-types'

import { lexicalBody, pngBytes } from '../helpers/articleFixtures'

const password = 'test-password-123'
const DAY = 24 * 60 * 60 * 1000
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString()
const PAST = '2020-01-01T00:00:00.000Z'
const CLIENT_DATE = '2001-01-01T00:00:00.000Z'

let payload: Payload
let editor: User
let journalist: User
let category: Category
let author: Author
let media: Media

const makeUser = (email: string, name: string, role: 'admin' | 'editor' | 'journalist') =>
  payload.create({ collection: 'users', data: { email, password, name, role } })

const content = () => ({
  excerpt: 'Resumen de prueba',
  body: lexicalBody('Contenido de prueba'),
  featuredImage: media.id,
})

// Creates a complete article as the given user; `extra` overrides any field.
const create = (user: User, title: string, extra: Record<string, unknown> = {}) =>
  payload.create({
    collection: 'articles',
    data: {
      title,
      slug: '',
      categories: [category.id],
      author: author.id,
      ...content(),
      ...extra,
    } as never,
    user,
    overrideAccess: false,
    depth: 0,
  })

// System-level fixture (no user): skips the publication hooks on purpose.
const seed = (title: string, extra: Record<string, unknown> = {}) =>
  payload.create({
    collection: 'articles',
    data: {
      title,
      slug: '',
      categories: [category.id],
      author: author.id,
      ...content(),
      ...extra,
    } as never,
    depth: 0,
  })

const patch = (user: User, id: number, data: Record<string, unknown>) =>
  payload.update({
    collection: 'articles',
    id,
    data: data as never,
    user,
    overrideAccess: false,
    depth: 0,
  })

const fresh = (id: number) => payload.findByID({ collection: 'articles', id, depth: 0 })

const versionsOf = async (articleId: number) =>
  (
    await payload.findVersions({
      collection: 'articles',
      where: { parent: { equals: articleId } },
      sort: 'createdAt',
      limit: 100,
      depth: 0,
    })
  ).docs

const restore = (user: User, versionId: number | string) =>
  payload.restoreVersion({
    collection: 'articles',
    id: String(versionId),
    user,
    overrideAccess: false,
    depth: 0,
  })

const time = (value: string | null | undefined) => new Date(value as string).getTime()

const cleanArticles = () =>
  payload.delete({ collection: 'articles', where: { id: { exists: true } } })

describe('Article publication rules', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // Safe: vitest.setup.ts guarantees this is the throwaway test database.
    await cleanArticles()
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
    await payload.delete({ collection: 'authors', where: { id: { exists: true } } })
    await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
    await payload.delete({ collection: 'users', where: { id: { exists: true } } })

    await makeUser('admin@test.local', 'Admin', 'admin')
    editor = await makeUser('editor@test.local', 'Editor', 'editor')
    journalist = await makeUser('journalist@test.local', 'Journalist', 'journalist')
    category = await payload.create({ collection: 'categories', data: { name: 'K-pop', slug: '' } })
    author = await payload.create({
      collection: 'authors',
      data: { displayName: 'Redacción', slug: '' },
    })
    media = await payload.create({
      collection: 'media',
      data: { alt: 'Imagen de prueba' },
      file: { data: pngBytes, mimetype: 'image/png', name: 'fixture.png', size: pngBytes.length },
    })
  })

  afterAll(async () => {
    await cleanArticles()
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
  })

  it('requires an image, a summary and content to publish or schedule', async () => {
    const variants: Record<string, Record<string, unknown>> = {
      'imagen destacada': { featuredImage: undefined },
      resumen: { excerpt: '' },
      contenido: { body: lexicalBody('') },
    }
    for (const [missing, override] of Object.entries(variants)) {
      const draft = await create(editor, `Incompleta sin ${missing}`, override)
      await expect(patch(editor, draft.id, { editorialStatus: 'published' })).rejects.toThrow(
        missing,
      )
      await expect(
        patch(editor, draft.id, { editorialStatus: 'scheduled', publishedAt: inDays(1) }),
      ).rejects.toThrow(missing)
      expect((await fresh(draft.id)).editorialStatus).toBe('draft')
    }
  })

  it('sets the first publication date on the server, ignoring the client', async () => {
    const draft = await create(editor, 'Fecha del servidor')
    const published = await patch(editor, draft.id, {
      editorialStatus: 'published',
      publishedAt: CLIENT_DATE,
    })
    expect(Math.abs(time(published.publishedAt) - Date.now())).toBeLessThan(60_000)
  })

  it('also ignores a client date when an editor creates an already published article', async () => {
    const created = await create(editor, 'Creada publicada', {
      editorialStatus: 'published',
      publishedAt: CLIENT_DATE,
    })
    expect(created.editorialStatus).toBe('published')
    expect(Math.abs(time(created.publishedAt) - Date.now())).toBeLessThan(60_000)
  })

  it('keeps the first publication date forever, even after unpublishing and republishing', async () => {
    const draft = await create(editor, 'Fecha permanente')
    const first = await patch(editor, draft.id, { editorialStatus: 'published' })
    const original = time(first.publishedAt)

    await expect(patch(editor, draft.id, { publishedAt: inDays(-30) })).rejects.toThrow(
      'primera publicación',
    )
    await expect(patch(editor, draft.id, { publishedAt: null })).rejects.toThrow(
      'primera publicación',
    )

    const unpublished = await patch(editor, draft.id, { editorialStatus: 'draft' })
    expect(time(unpublished.publishedAt)).toBe(original)

    const again = await patch(editor, draft.id, { editorialStatus: 'published' })
    expect(time(again.publishedAt)).toBe(original)
  })

  it('does not let a previously published article be scheduled again', async () => {
    const draft = await create(editor, 'Ya publicada')
    await patch(editor, draft.id, { editorialStatus: 'published' })
    await patch(editor, draft.id, { editorialStatus: 'draft' })
    await expect(
      patch(editor, draft.id, { editorialStatus: 'scheduled', publishedAt: inDays(7) }),
    ).rejects.toThrow('reprogramar')
    expect((await fresh(draft.id)).editorialStatus).toBe('draft')
  })

  it('accepts only a future date when scheduling', async () => {
    const draft = await create(editor, 'Programación')
    await expect(
      patch(editor, draft.id, { editorialStatus: 'scheduled', publishedAt: PAST }),
    ).rejects.toThrow('futura')
    await expect(patch(editor, draft.id, { editorialStatus: 'scheduled' })).rejects.toThrow(
      'futura',
    )
    const target = inDays(3)
    const scheduled = await patch(editor, draft.id, {
      editorialStatus: 'scheduled',
      publishedAt: target,
    })
    expect(time(scheduled.publishedAt)).toBe(time(target))
  })

  it('lets editors change the date of a scheduled article while it is still scheduled', async () => {
    const draft = await create(editor, 'Reprogramable')
    await patch(editor, draft.id, { editorialStatus: 'scheduled', publishedAt: inDays(3) })

    const later = inDays(10)
    const moved = await patch(editor, draft.id, { publishedAt: later })
    expect(time(moved.publishedAt)).toBe(time(later))

    await expect(patch(editor, draft.id, { publishedAt: PAST })).rejects.toThrow('futura')
  })

  it('clears the future date when a scheduled article goes back to draft', async () => {
    const draft = await create(editor, 'Se desprograma')
    await patch(editor, draft.id, { editorialStatus: 'scheduled', publishedAt: inDays(3) })
    await patch(editor, draft.id, { editorialStatus: 'draft' })
    expect((await fresh(draft.id)).publishedAt ?? null).toBeNull()
  })

  it('publishes a scheduled article early with the server time', async () => {
    const draft = await create(editor, 'Adelantada')
    await patch(editor, draft.id, { editorialStatus: 'scheduled', publishedAt: inDays(5) })
    const published = await patch(editor, draft.id, { editorialStatus: 'published' })
    expect(Math.abs(time(published.publishedAt) - Date.now())).toBeLessThan(60_000)
  })

  it('treats a due scheduled article as already published', async () => {
    const due = await seed('Programada vencida', {
      editorialStatus: 'scheduled',
      publishedAt: PAST,
    })
    const visible = await payload.find({
      collection: 'articles',
      where: { slug: { equals: due.slug } },
      overrideAccess: false,
      depth: 0,
    })
    expect(visible.totalDocs).toBe(1)

    await expect(patch(editor, due.id, { publishedAt: inDays(5) })).rejects.toThrow(
      'primera publicación',
    )
    const back = await patch(editor, due.id, { editorialStatus: 'draft' })
    expect(time(back.publishedAt)).toBe(time(PAST))
  })

  it('ignores publication dates sent by journalists', async () => {
    const mine = await create(journalist, 'Fecha de periodista', { publishedAt: inDays(2) })
    expect((await fresh(mine.id)).publishedAt ?? null).toBeNull()

    await patch(journalist, mine.id, { publishedAt: inDays(2) })
    expect((await fresh(mine.id)).publishedAt ?? null).toBeNull()
  })

  it('makes a published article public and keeps a future scheduled one hidden', async () => {
    const live = await create(editor, 'Visible para todos', { editorialStatus: 'published' })
    const future = await create(editor, 'Oculta hasta su hora', {
      editorialStatus: 'scheduled',
      publishedAt: inDays(2),
    })
    const find = (slug: string) =>
      payload.find({
        collection: 'articles',
        where: { slug: { equals: slug } },
        overrideAccess: false,
        depth: 0,
      })
    expect((await find(live.slug)).totalDocs).toBe(1)
    expect((await find(future.slug)).totalDocs).toBe(0)
  })

  it('keeps a live article complete', async () => {
    const live = await create(editor, 'Artículo en vivo', { editorialStatus: 'published' })
    await expect(patch(editor, live.id, { excerpt: '' })).rejects.toThrow('resumen')
    expect((await fresh(live.id)).excerpt).toBe('Resumen de prueba')
  })

  it('lets editors restore the content of an older version', async () => {
    const article = await create(editor, 'Contenido restaurable', {
      excerpt: 'Primera redacción',
    })
    await patch(editor, article.id, { excerpt: 'Segunda redacción' })

    const first = (await versionsOf(article.id)).find(
      (v) => v.version.excerpt === 'Primera redacción',
    )
    if (!first) throw new Error('The first version was not saved')

    await restore(editor, first.id)
    expect((await fresh(article.id)).excerpt).toBe('Primera redacción')
  })

  it('does not let journalists restore versions, not even of their own drafts', async () => {
    const mine = await create(journalist, 'Versiones propias', { excerpt: 'Primera redacción' })
    await patch(journalist, mine.id, { excerpt: 'Segunda redacción' })

    const first = (await versionsOf(mine.id)).find((v) => v.version.excerpt === 'Primera redacción')
    if (!first) throw new Error('The first version was not saved')

    await expect(restore(journalist, first.id)).rejects.toThrow()
    expect((await fresh(mine.id)).excerpt).toBe('Segunda redacción')
  })

  it('does not let a restore erase the first publication date', async () => {
    const article = await create(editor, 'Restaurar sobre publicada')
    await patch(editor, article.id, { excerpt: 'Antes de publicar' })
    const published = await patch(editor, article.id, { editorialStatus: 'published' })
    const original = time(published.publishedAt)

    const draftVersion = (await versionsOf(article.id)).find(
      (v) => v.version.editorialStatus === 'draft',
    )
    if (!draftVersion) throw new Error('The draft version was not saved')

    // Either the restore is rejected or it keeps the date; it must never wipe it.
    await restore(editor, draftVersion.id).catch(() => undefined)
    expect(time((await fresh(article.id)).publishedAt)).toBe(original)
  })

  it('does not let a restore reschedule an article that is already public', async () => {
    const article = await create(editor, 'Restaurar programada')
    await patch(editor, article.id, { editorialStatus: 'scheduled', publishedAt: inDays(5) })
    const published = await patch(editor, article.id, { editorialStatus: 'published' })

    const scheduledVersion = (await versionsOf(article.id)).find(
      (v) => v.version.editorialStatus === 'scheduled',
    )
    if (!scheduledVersion) throw new Error('The scheduled version was not saved')

    await restore(editor, scheduledVersion.id).catch(() => undefined)
    const after = await fresh(article.id)
    expect(after.editorialStatus).toBe('published')
    expect(time(after.publishedAt)).toBe(time(published.publishedAt))
  })
})

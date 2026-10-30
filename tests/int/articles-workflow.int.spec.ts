// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Article, Author, Category, Media, User } from '@/payload-types'

import { lexicalBody, pngBytes } from '../helpers/articleFixtures'

const password = 'test-password-123'

type Status = Article['editorialStatus']

let payload: Payload
let editor: User
let journalist: User
let category: Category
let author: Author
let media: Media

const makeUser = (email: string, name: string, role: 'admin' | 'editor' | 'journalist') =>
  payload.create({ collection: 'users', data: { email, password, name, role } })

const make = (user: User, title: string) =>
  payload.create({
    collection: 'articles',
    data: {
      title,
      slug: '',
      categories: [category.id],
      author: author.id,
      excerpt: 'Resumen de prueba',
      body: lexicalBody('Contenido de prueba'),
      featuredImage: media.id,
    } as never,
    user,
    overrideAccess: false,
    depth: 0,
  })

const move = (user: User, id: number, editorialStatus: Status) =>
  payload.update({
    collection: 'articles',
    id,
    data: { editorialStatus },
    user,
    overrideAccess: false,
    depth: 0,
  })

const statusOf = async (id: number) =>
  (await payload.findByID({ collection: 'articles', id, depth: 0 })).editorialStatus

const cleanArticles = () =>
  payload.delete({ collection: 'articles', where: { id: { exists: true } } })

describe('Article status transitions', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
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

  it('lets a journalist submit their own draft for review', async () => {
    const mine = await make(journalist, 'Para enviar')
    const moved = await move(journalist, mine.id, 'in_review')
    expect(moved.editorialStatus).toBe('in_review')
  })

  it('does not let a journalist publish, schedule or archive', async () => {
    const mine = await make(journalist, 'Intento de saltar el flujo')
    for (const target of ['published', 'scheduled', 'archived'] as Status[]) {
      await expect(move(journalist, mine.id, target)).rejects.toThrow()
    }
    expect(await statusOf(mine.id)).toBe('draft')
  })

  it('lets a journalist resubmit a rejected article', async () => {
    const mine = await make(journalist, 'Para reenviar')
    await move(editor, mine.id, 'in_review')
    await move(editor, mine.id, 'rejected')
    const moved = await move(journalist, mine.id, 'in_review')
    expect(moved.editorialStatus).toBe('in_review')
  })

  it('lets editors approve a submitted article', async () => {
    const mine = await make(journalist, 'Para aprobar')
    await move(journalist, mine.id, 'in_review')
    const approved = await move(editor, mine.id, 'published')
    expect(approved.editorialStatus).toBe('published')
  })

  it('rejects a skipped step: a rejected article cannot go straight to published', async () => {
    const mine = await make(journalist, 'Salto no permitido')
    await move(editor, mine.id, 'in_review')
    await move(editor, mine.id, 'rejected')
    await expect(move(editor, mine.id, 'published')).rejects.toThrow()
    expect(await statusOf(mine.id)).toBe('rejected')
  })

  it('makes an archived article go back through draft', async () => {
    const mine = await make(editor, 'Archivada')
    await move(editor, mine.id, 'archived')
    await expect(move(editor, mine.id, 'published')).rejects.toThrow()
    const back = await move(editor, mine.id, 'draft')
    expect(back.editorialStatus).toBe('draft')
  })

  it('lets editors unpublish a published article', async () => {
    const mine = await make(editor, 'Se despublica')
    await move(editor, mine.id, 'published')
    const unpublished = await move(editor, mine.id, 'draft')
    expect(unpublished.editorialStatus).toBe('draft')
  })

  it('lets editors edit a published article without changing its status', async () => {
    const mine = await make(editor, 'Corrección en vivo')
    await move(editor, mine.id, 'published')
    const edited = await payload.update({
      collection: 'articles',
      id: mine.id,
      data: { excerpt: 'Texto corregido' },
      user: editor,
      overrideAccess: false,
    })
    expect(edited.excerpt).toBe('Texto corregido')
    expect(edited.editorialStatus).toBe('published')
  })
})

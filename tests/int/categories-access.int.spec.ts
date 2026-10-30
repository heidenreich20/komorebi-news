// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'

const password = 'test-password-123'

let payload: Payload
let admin: User
let editor: User
let journalist: User

const makeUser = (email: string, name: string, role: 'admin' | 'editor' | 'journalist') =>
  payload.create({ collection: 'users', data: { email, password, name, role } })

// slug is left empty on purpose: the field hook must build it from the name.
const makeCategory = (name: string, isActive = true) =>
  payload.create({ collection: 'categories', data: { name, slug: '', isActive } })

describe('Categories', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // Safe: vitest.setup.ts guarantees this is the throwaway test database.
    await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
    await payload.delete({ collection: 'users', where: { id: { exists: true } } })

    admin = await makeUser('admin@test.local', 'Admin', 'admin')
    editor = await makeUser('editor@test.local', 'Editor', 'editor')
    journalist = await makeUser('journalist@test.local', 'Journalist', 'journalist')
  })

  it('builds the slug from the name, without accents', async () => {
    const category = await makeCategory('Economía')
    expect(category.slug).toBe('economia')
  })

  it('rejects a duplicate slug', async () => {
    await expect(makeCategory('economia')).rejects.toThrow()
  })

  it('shows anonymous visitors and journalists only active categories', async () => {
    await makeCategory('Política')
    await makeCategory('Archivo', false)

    const anonymous = await payload.find({ collection: 'categories', overrideAccess: false })
    expect(anonymous.docs.every((doc) => doc.isActive)).toBe(true)
    expect(anonymous.docs.some((doc) => doc.slug === 'archivo')).toBe(false)

    const asJournalist = await payload.find({
      collection: 'categories',
      user: journalist,
      overrideAccess: false,
    })
    expect(asJournalist.docs.some((doc) => doc.slug === 'archivo')).toBe(false)
    expect(asJournalist.docs.some((doc) => doc.slug === 'politica')).toBe(true)
  })

  it('shows editors and administrators inactive categories too', async () => {
    for (const user of [editor, admin]) {
      const result = await payload.find({
        collection: 'categories',
        user,
        overrideAccess: false,
      })
      expect(result.docs.some((doc) => doc.slug === 'archivo')).toBe(true)
    }
  })

  it('rejects creating categories by anonymous visitors and journalists', async () => {
    await expect(
      payload.create({
        collection: 'categories',
        data: { name: 'Anon', slug: '' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'categories',
        data: { name: 'Periodista', slug: '' },
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('allows editors to create and update categories', async () => {
    const created = await payload.create({
      collection: 'categories',
      data: { name: 'Cultura', slug: '' },
      user: editor,
      overrideAccess: false,
    })
    const updated = await payload.update({
      collection: 'categories',
      id: created.id,
      data: { description: 'Arte y espectáculos' },
      user: editor,
      overrideAccess: false,
    })
    expect(updated.description).toBe('Arte y espectáculos')
  })

  it('rejects updates by journalists', async () => {
    const [existing] = (await payload.find({ collection: 'categories', limit: 1 })).docs
    await expect(
      payload.update({
        collection: 'categories',
        id: existing.id,
        data: { name: 'Hackeada' },
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('lets only administrators delete categories', async () => {
    const target = await makeCategory('Temporal')

    await expect(
      payload.delete({
        collection: 'categories',
        id: target.id,
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const deleted = await payload.delete({
      collection: 'categories',
      id: target.id,
      user: admin,
      overrideAccess: false,
    })
    expect(deleted.id).toBe(target.id)
  })
})

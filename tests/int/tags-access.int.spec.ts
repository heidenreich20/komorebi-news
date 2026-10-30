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
const makeTag = (name: string) => payload.create({ collection: 'tags', data: { name, slug: '' } })

describe('Tags', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // Safe: vitest.setup.ts guarantees this is the throwaway test database.
    await payload.delete({ collection: 'tags', where: { id: { exists: true } } })
    await payload.delete({ collection: 'users', where: { id: { exists: true } } })

    admin = await makeUser('admin@test.local', 'Admin', 'admin')
    editor = await makeUser('editor@test.local', 'Editor', 'editor')
    journalist = await makeUser('journalist@test.local', 'Journalist', 'journalist')
  })

  it('builds the slug from the name, without accents', async () => {
    const tag = await makeTag('Gira mundial')
    expect(tag.slug).toBe('gira-mundial')
    const accented = await makeTag('Estética y moda')
    expect(accented.slug).toBe('estetica-y-moda')
  })

  it('rejects a duplicate slug', async () => {
    await expect(makeTag('gira mundial')).rejects.toThrow()
  })

  it('lets anyone read tags, including anonymous visitors', async () => {
    const result = await payload.find({ collection: 'tags', overrideAccess: false })
    expect(result.docs.some((doc) => doc.slug === 'gira-mundial')).toBe(true)
  })

  it('rejects creating tags by anonymous visitors and journalists', async () => {
    await expect(
      payload.create({
        collection: 'tags',
        data: { name: 'Anon', slug: '' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'tags',
        data: { name: 'Periodista', slug: '' },
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('allows editors to create and update tags', async () => {
    const created = await payload.create({
      collection: 'tags',
      data: { name: 'Debut', slug: '' },
      user: editor,
      overrideAccess: false,
    })
    const updated = await payload.update({
      collection: 'tags',
      id: created.id,
      data: { description: 'Primeras presentaciones' },
      user: editor,
      overrideAccess: false,
    })
    expect(updated.description).toBe('Primeras presentaciones')
  })

  it('rejects updates by journalists', async () => {
    const [existing] = (await payload.find({ collection: 'tags', limit: 1 })).docs
    await expect(
      payload.update({
        collection: 'tags',
        id: existing.id,
        data: { name: 'Hackeada' },
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('lets only administrators delete tags', async () => {
    const target = await makeTag('Temporal')

    await expect(
      payload.delete({
        collection: 'tags',
        id: target.id,
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const deleted = await payload.delete({
      collection: 'tags',
      id: target.id,
      user: admin,
      overrideAccess: false,
    })
    expect(deleted.id).toBe(target.id)
  })
})

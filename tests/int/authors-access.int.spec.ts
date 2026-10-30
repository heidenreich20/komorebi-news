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

// slug is left empty on purpose: the field hook must build it from the display name.
const makeAuthor = (displayName: string, isActive = true) =>
  payload.create({ collection: 'authors', data: { displayName, slug: '', isActive } })

describe('Authors', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // Safe: vitest.setup.ts guarantees this is the throwaway test database.
    await payload.delete({ collection: 'authors', where: { id: { exists: true } } })
    await payload.delete({ collection: 'users', where: { id: { exists: true } } })

    admin = await makeUser('admin@test.local', 'Admin', 'admin')
    editor = await makeUser('editor@test.local', 'Editor', 'editor')
    journalist = await makeUser('journalist@test.local', 'Journalist', 'journalist')
  })

  it('builds the slug from the display name, without accents', async () => {
    const author = await makeAuthor('María Fernández')
    expect(author.slug).toBe('maria-fernandez')
  })

  it('rejects a duplicate slug', async () => {
    await expect(makeAuthor('maria fernandez')).rejects.toThrow()
  })

  it('shows anonymous visitors and journalists only active authors', async () => {
    await makeAuthor('Equipo Activo')
    await makeAuthor('Colaborador Inactivo', false)

    const anonymous = await payload.find({ collection: 'authors', overrideAccess: false })
    expect(anonymous.docs.every((doc) => doc.isActive)).toBe(true)
    expect(anonymous.docs.some((doc) => doc.slug === 'colaborador-inactivo')).toBe(false)

    const asJournalist = await payload.find({
      collection: 'authors',
      user: journalist,
      overrideAccess: false,
    })
    expect(asJournalist.docs.some((doc) => doc.slug === 'colaborador-inactivo')).toBe(false)
    expect(asJournalist.docs.some((doc) => doc.slug === 'equipo-activo')).toBe(true)
  })

  it('shows editors and administrators inactive authors too', async () => {
    for (const user of [editor, admin]) {
      const result = await payload.find({
        collection: 'authors',
        user,
        overrideAccess: false,
      })
      expect(result.docs.some((doc) => doc.slug === 'colaborador-inactivo')).toBe(true)
    }
  })

  it('rejects creating authors by anonymous visitors and journalists', async () => {
    await expect(
      payload.create({
        collection: 'authors',
        data: { displayName: 'Anon', slug: '' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'authors',
        data: { displayName: 'Periodista', slug: '' },
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('allows editors to create and update authors', async () => {
    const created = await payload.create({
      collection: 'authors',
      data: { displayName: 'Nueva Redactora', slug: '' },
      user: editor,
      overrideAccess: false,
    })
    const updated = await payload.update({
      collection: 'authors',
      id: created.id,
      data: { biography: 'Cubre música y cultura coreana' },
      user: editor,
      overrideAccess: false,
    })
    expect(updated.biography).toBe('Cubre música y cultura coreana')
  })

  it('rejects updates by journalists', async () => {
    const [existing] = (await payload.find({ collection: 'authors', limit: 1 })).docs
    await expect(
      payload.update({
        collection: 'authors',
        id: existing.id,
        data: { displayName: 'Hackeada' },
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('lets only administrators delete authors', async () => {
    const target = await makeAuthor('Temporal')

    await expect(
      payload.delete({
        collection: 'authors',
        id: target.id,
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const deleted = await payload.delete({
      collection: 'authors',
      id: target.id,
      user: admin,
      overrideAccess: false,
    })
    expect(deleted.id).toBe(target.id)
  })

  it('accepts https social links and rejects other schemes', async () => {
    const ok = await payload.create({
      collection: 'authors',
      data: {
        displayName: 'Con Redes',
        slug: '',
        socialLinks: [{ label: 'Instagram', url: 'https://instagram.com/ejemplo' }],
      },
    })
    expect(ok.socialLinks?.[0]?.url).toBe('https://instagram.com/ejemplo')

    await expect(
      payload.create({
        collection: 'authors',
        data: {
          displayName: 'Con Enlace Malo',
          slug: '',
          socialLinks: [{ label: 'Malo', url: 'javascript:alert(1)' }],
        },
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'authors',
        data: {
          displayName: 'Con Texto Suelto',
          slug: '',
          socialLinks: [{ label: 'Texto', url: 'no es una url' }],
        },
      }),
    ).rejects.toThrow()
  })
})

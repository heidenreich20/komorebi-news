// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'

const password = 'test-password-123'

// A valid 1x1 PNG.
const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

let payload: Payload
let admin: User
let editor: User
let journalist: User
let otherJournalist: User

const makeUser = (email: string, name: string, role: 'admin' | 'editor' | 'journalist') =>
  payload.create({ collection: 'users', data: { email, password, name, role } })

const idOf = (value: unknown): unknown =>
  value && typeof value === 'object' ? (value as { id: unknown }).id : value

const upload = (
  user: User | undefined,
  extra: { name?: string; mimetype?: string; data?: Buffer; fields?: Record<string, unknown> } = {},
) => {
  const data = extra.data ?? pngBytes
  return payload.create({
    collection: 'media',
    data: { alt: 'Imagen de prueba', ...extra.fields },
    file: {
      data,
      mimetype: extra.mimetype ?? 'image/png',
      name: extra.name ?? 'test.png',
      size: data.length,
    },
    user,
    overrideAccess: false,
    depth: 0,
  })
}

describe('Media', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // Safe: vitest.setup.ts guarantees this is the throwaway test database.
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
    await payload.delete({ collection: 'users', where: { id: { exists: true } } })

    admin = await makeUser('admin@test.local', 'Admin', 'admin')
    editor = await makeUser('editor@test.local', 'Editor', 'editor')
    journalist = await makeUser('journalist@test.local', 'Journalist', 'journalist')
    otherJournalist = await makeUser('other@test.local', 'Other', 'journalist')
  })

  it('rejects uploads by anonymous visitors', async () => {
    await expect(upload(undefined)).rejects.toThrow()
  })

  it('accepts a PNG from a journalist and records who uploaded it', async () => {
    const created = await upload(journalist)
    expect(created.mimeType).toBe('image/png')
    expect(idOf(created.uploadedBy)).toBe(journalist.id)
  })

  it('does not let a client choose uploadedBy', async () => {
    const created = await upload(journalist, { fields: { uploadedBy: admin.id } })
    expect(idOf(created.uploadedBy)).toBe(journalist.id)
  })

  it('requires alt text', async () => {
    await expect(upload(journalist, { fields: { alt: '' } })).rejects.toThrow()
  })

  it('rejects SVG uploads', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    )
    await expect(
      upload(journalist, { name: 'evil.svg', mimetype: 'image/svg+xml', data: svg }),
    ).rejects.toThrow()
  })

  it('rejects non-image files', async () => {
    const pdf = Buffer.from('%PDF-1.4 test')
    await expect(
      upload(journalist, { name: 'doc.pdf', mimetype: 'application/pdf', data: pdf }),
    ).rejects.toThrow()
  })

  it('rejects a source URL that is not http(s)', async () => {
    await expect(
      upload(journalist, { fields: { sourceUrl: 'javascript:alert(1)' } }),
    ).rejects.toThrow()
    const ok = await upload(journalist, { fields: { sourceUrl: 'https://example.com/foto' } })
    expect(ok.sourceUrl).toBe('https://example.com/foto')
  })

  it('lets anyone read media, including anonymous visitors', async () => {
    const result = await payload.find({ collection: 'media', overrideAccess: false })
    expect(result.totalDocs).toBeGreaterThan(0)
  })

  it('lets a journalist edit their own upload but not someone else’s', async () => {
    const mine = await upload(journalist)
    const theirs = await upload(otherJournalist)

    const updated = await payload.update({
      collection: 'media',
      id: mine.id,
      data: { caption: 'Mi pie de foto' },
      user: journalist,
      overrideAccess: false,
    })
    expect(updated.caption).toBe('Mi pie de foto')

    await expect(
      payload.update({
        collection: 'media',
        id: theirs.id,
        data: { caption: 'Intrusión' },
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('lets editors edit any upload', async () => {
    const theirs = await upload(otherJournalist)
    const updated = await payload.update({
      collection: 'media',
      id: theirs.id,
      data: { credit: 'Agencia' },
      user: editor,
      overrideAccess: false,
    })
    expect(updated.credit).toBe('Agencia')
  })

  it('does not let journalists delete media, but lets editors and admins', async () => {
    const target = await upload(journalist)
    await expect(
      payload.delete({
        collection: 'media',
        id: target.id,
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const deleted = await payload.delete({
      collection: 'media',
      id: target.id,
      user: editor,
      overrideAccess: false,
    })
    expect(deleted.id).toBe(target.id)

    const other = await upload(journalist)
    const byAdmin = await payload.delete({
      collection: 'media',
      id: other.id,
      user: admin,
      overrideAccess: false,
    })
    expect(byAdmin.id).toBe(other.id)
  })
})

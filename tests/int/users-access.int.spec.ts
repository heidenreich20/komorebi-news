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
let otherJournalist: User

const makeUser = (
  email: string,
  name: string,
  role: 'admin' | 'editor' | 'journalist',
  active = true,
) =>
  payload.create({
    collection: 'users',
    data: { email, password, name, role, active },
  })

describe('Users access control', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // Safe: vitest.setup.ts guarantees this is the throwaway test database.
    await payload.delete({ collection: 'users', where: { id: { exists: true } } })
  })

  it('makes the first user an administrator, whatever role is requested', async () => {
    admin = await makeUser('admin@test.local', 'Admin', 'journalist')
    expect(admin.role).toBe('admin')
    expect(admin.active).toBe(true)
  })

  it('keeps the requested role for users created after the first', async () => {
    editor = await makeUser('editor@test.local', 'Editor', 'editor')
    journalist = await makeUser('journalist@test.local', 'Journalist', 'journalist')
    otherJournalist = await makeUser('other@test.local', 'Other', 'journalist')
    expect(editor.role).toBe('editor')
    expect(journalist.role).toBe('journalist')
  })

  it('rejects user creation by anonymous visitors', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: { email: 'anon@test.local', password, name: 'Anon', role: 'admin' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('rejects user creation by journalists and editors', async () => {
    for (const user of [journalist, editor]) {
      await expect(
        payload.create({
          collection: 'users',
          data: { email: `x-${user.role}@test.local`, password, name: 'X', role: 'admin' },
          user,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    }
  })

  it('allows administrators to create users', async () => {
    const created = await payload.create({
      collection: 'users',
      data: { email: 'made-by-admin@test.local', password, name: 'Made', role: 'editor' },
      user: admin,
      overrideAccess: false,
    })
    expect(created.role).toBe('editor')
  })

  it('does not let a journalist change their own role or active flag', async () => {
    // Payload may strip the protected fields or throw; either way the stored values must not change.
    await payload
      .update({
        collection: 'users',
        id: journalist.id,
        data: { role: 'admin', active: false },
        user: journalist,
        overrideAccess: false,
      })
      .catch(() => undefined)

    const stored = await payload.findByID({ collection: 'users', id: journalist.id })
    expect(stored.role).toBe('journalist')
    expect(stored.active).toBe(true)
  })

  it('lets journalists and editors read only their own record', async () => {
    for (const user of [journalist, editor]) {
      const result = await payload.find({
        collection: 'users',
        user,
        overrideAccess: false,
      })
      expect(result.totalDocs).toBe(1)
      expect(result.docs[0].id).toBe(user.id)
    }
  })

  it('lets administrators read every user', async () => {
    const result = await payload.find({ collection: 'users', user: admin, overrideAccess: false })
    expect(result.totalDocs).toBeGreaterThanOrEqual(5)
  })

  it('rejects deletion of other users by non-administrators', async () => {
    await expect(
      payload.delete({
        collection: 'users',
        id: otherJournalist.id,
        user: journalist,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('denies everything to a deactivated account', async () => {
    const inactive = await makeUser('inactive@test.local', 'Inactive', 'journalist', false)
    await expect(
      payload.find({ collection: 'users', user: inactive, overrideAccess: false }),
    ).rejects.toThrow()
  })
})

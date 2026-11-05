// @vitest-environment node
import { randomUUID } from 'node:crypto'

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'

const password = 'test-password-123'
const suffix = randomUUID()
const roles = ['admin', 'editor', 'journalist'] as const
type Role = (typeof roles)[number]

let payload: Payload
let admin: User
const activeUsers = new Map<Role, User>()
const inactiveUsers = new Map<Role, User>()

const makeUser = (email: string, role: Role, active = true) =>
  payload.create({
    collection: 'users',
    data: { email, password, name: `${role} ${active ? 'active' : 'inactive'}`, role, active },
  })

const login = (user: User) =>
  payload.login({ collection: 'users', data: { email: user.email, password } })

const authenticate = (token: string) =>
  payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })

describe('Users authentication and session revocation', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    admin = await makeUser(`auth-admin-${suffix}@test.local`, 'admin')

    for (const role of roles) {
      if (role !== 'admin') {
        activeUsers.set(role, await makeUser(`auth-${role}-${suffix}@test.local`, role))
      }
      activeUsers.set('admin', admin)
      inactiveUsers.set(role, await makeUser(`inactive-${role}-${suffix}@test.local`, role))
    }
  })

  afterAll(async () => {
    await payload?.destroy()
  })

  it('allows active administrators, editors, and journalists to log in', async () => {
    for (const role of roles) {
      const result = await login(activeUsers.get(role)!)
      expect(result.token).toBeTruthy()
      expect(result.user?.role).toBe(role)
    }
  })

  it('rejects inactive administrators, editors, and journalists at login', async () => {
    for (const role of roles) {
      const user = inactiveUsers.get(role)!
      await payload.update({
        collection: 'users',
        id: user.id,
        data: { active: false },
        user: admin,
        overrideAccess: false,
      })

      await expect(login(user)).rejects.toThrow()
    }
  })

  it('does not issue a usable token through password reset for an inactive user', async () => {
    const user = inactiveUsers.get('journalist')!
    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email: user.email },
      disableEmail: true,
    })

    expect(token).toBeTruthy()
    await expect(
      payload.resetPassword({
        collection: 'users',
        data: { password: 'new-test-password-123', token: token! },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })

  it('revokes all of a deactivated user’s sessions without affecting another user', async () => {
    const target = activeUsers.get('journalist')!
    const unaffected = activeUsers.get('editor')!
    const firstSession = await login(target)
    const secondSession = await login(target)
    const unaffectedSession = await login(unaffected)

    await payload.update({
      collection: 'users',
      id: target.id,
      data: { active: false },
      user: admin,
      overrideAccess: false,
    })

    const stored = await payload.findByID({
      collection: 'users',
      id: target.id,
      overrideAccess: true,
      showHiddenFields: true,
    })
    expect(stored.sessions).toEqual([])
    expect((await authenticate(firstSession.token!)).user).toBeNull()
    expect((await authenticate(secondSession.token!)).user).toBeNull()
    expect((await authenticate(unaffectedSession.token!)).user?.id).toBe(unaffected.id)
  })

  it('does not repeat cleanup for an already inactive user', async () => {
    const user = inactiveUsers.get('editor')!
    const markerSession = {
      id: `marker-${suffix}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { sessions: [markerSession] },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { name: 'Still inactive' },
      user: admin,
      overrideAccess: false,
    })

    const stored = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      showHiddenFields: true,
    })
    expect(stored.sessions?.map(({ id }) => id)).toContain(markerSession.id)
  })

  it('does not revoke sessions after unrelated updates to active users', async () => {
    const user = activeUsers.get('admin')!
    const session = await login(user)

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { name: `Renamed ${suffix}` },
      user: admin,
      overrideAccess: false,
    })

    expect((await authenticate(session.token!)).user?.id).toBe(user.id)
  })

  it('rolls back deactivation if session cleanup fails', async () => {
    const user = await makeUser(`rollback-${suffix}@test.local`, 'journalist')
    const originalUpdate = payload.update.bind(payload)
    const updateSpy = vi.spyOn(payload, 'update')
    updateSpy.mockImplementationOnce(originalUpdate)
    updateSpy.mockRejectedValueOnce(new Error('Simulated session cleanup failure'))

    try {
      await expect(
        payload.update({
          collection: 'users',
          id: user.id,
          data: { active: false },
          user: admin,
          overrideAccess: false,
        }),
      ).rejects.toThrow('Simulated session cleanup failure')
    } finally {
      updateSpy.mockRestore()
    }

    const stored = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
    })
    expect(stored.active).toBe(true)
  })
})

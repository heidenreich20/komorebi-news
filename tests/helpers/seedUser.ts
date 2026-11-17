import { loadAndGuardE2EEnv } from './e2eEnv'

export const testUser = {
  email: 'dev@payloadcms.com',
  password: 'test',
  name: 'Test Admin',
  role: 'admin' as const,
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  loadAndGuardE2EEnv()
  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('../../src/payload.config.js'),
  ])
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })

  // Create fresh test user
  await payload.create({
    collection: 'users',
    data: testUser,
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  loadAndGuardE2EEnv()
  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('../../src/payload.config.js'),
  ])
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
}

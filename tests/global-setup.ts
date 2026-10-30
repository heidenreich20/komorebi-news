import { spawnSync } from 'node:child_process'

import { loadAndGuardTestEnv } from './helpers/testEnv'

export default function setup(): void {
  const host = loadAndGuardTestEnv()
  console.log(`Applying migrations to test database host: ${host}`)

  const result = spawnSync('pnpm', ['payload', 'migrate'], {
    env: { ...process.env },
    stdio: 'inherit',
    shell: true,
  })
  if (result.status !== 0) {
    throw new Error('Migrating the test database failed.')
  }
}

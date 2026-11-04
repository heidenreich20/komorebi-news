import { existsSync } from 'node:fs'

import { config } from 'dotenv'

const hostOf = (value: string | undefined): string | null => {
  if (!value) return null

  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Load the dedicated E2E environment and reject the configured production DB host.
 * This helper must run before starting the web server or touching fixture data.
 */
export function loadAndGuardE2EEnv(): string {
  if (!existsSync('.env.e2e')) {
    throw new Error('Missing .env.e2e: E2E tests require a dedicated E2E database.')
  }

  const result = config({ path: '.env.e2e', override: true })
  if (result.error) {
    throw new Error('Unable to load .env.e2e.')
  }

  const e2eURL = process.env.E2E_DATABASE_URL?.trim()
  const e2eHost = hostOf(e2eURL)
  if (!e2eURL || !e2eHost) {
    throw new Error('E2E_DATABASE_URL in .env.e2e must be a valid PostgreSQL URL.')
  }

  if (!/^postgres(ql)?:\/\//i.test(e2eURL)) {
    throw new Error('E2E_DATABASE_URL in .env.e2e must use PostgreSQL.')
  }

  const productionHost = process.env.PRODUCTION_DATABASE_HOST?.trim().toLowerCase()
  if (!productionHost || productionHost.includes('replace-with')) {
    throw new Error('Set PRODUCTION_DATABASE_HOST in .env.e2e to the production database hostname.')
  }

  if (e2eHost === productionHost) {
    throw new Error('E2E_DATABASE_URL points to the production database host. E2E aborted.')
  }

  const payloadSecret = process.env.PAYLOAD_SECRET?.trim()
  if (!payloadSecret || payloadSecret.length < 32 || payloadSecret.startsWith('replace-with')) {
    throw new Error('Set a development-only PAYLOAD_SECRET of at least 32 characters in .env.e2e.')
  }

  // Payload config and the Next.js web server consume DATABASE_URL.
  process.env.DATABASE_URL = e2eURL

  return e2eHost
}

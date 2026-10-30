import { existsSync, readFileSync } from 'node:fs'

import { config, parse } from 'dotenv'

const hostOf = (url: string | undefined): string | null => {
  try {
    return new URL(url ?? '').hostname
  } catch {
    return null
  }
}

// Locally, tests read ONLY .env.test (never .env). In CI the variables come from the workflow.
if (!process.env.CI) {
  if (!existsSync('.env.test')) {
    throw new Error('Missing .env.test: tests need their own throwaway database.')
  }
  config({ path: '.env.test', override: true })
}

const testHost = hostOf(process.env.DATABASE_URL)
if (!testHost) {
  throw new Error('DATABASE_URL is missing or not a valid URL for the test run.')
}

// In CI the database must be the local service container.
if (process.env.CI && testHost !== 'localhost' && testHost !== '127.0.0.1') {
  throw new Error('In CI the test database must be localhost.')
}

// Refuse to run if the test database is the same host as the dev database in .env.
if (existsSync('.env')) {
  const devHost = hostOf(parse(readFileSync('.env')).DATABASE_URL)
  if (devHost && devHost === testHost) {
    throw new Error('The test DATABASE_URL points at the same host as the dev .env. Aborting.')
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const databaseUrl = required('DATABASE_URL')
if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string (postgresql://...)')
}

const payloadSecret = required('PAYLOAD_SECRET')
if (payloadSecret.length < 32 || payloadSecret.startsWith('CHANGE_ME')) {
  throw new Error('PAYLOAD_SECRET must be a real random value of at least 32 characters')
}

export const env = {
  databaseUrl,
  payloadSecret,
}

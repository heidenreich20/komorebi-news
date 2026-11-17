function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined
}

function requireHttpsUrl(name: string, value: string): string {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL`)
  }

  if (url.protocol !== 'https:') {
    throw new Error(`${name} must use HTTPS`)
  }

  return value.replace(/\/+$/, '')
}

const databaseUrl = required('DATABASE_URL')
if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string (postgresql://...)')
}

const payloadSecret = required('PAYLOAD_SECRET')
if (payloadSecret.length < 32 || payloadSecret.startsWith('CHANGE_ME')) {
  throw new Error('PAYLOAD_SECRET must be a real random value of at least 32 characters')
}

const r2Values = {
  bucket: optional('R2_BUCKET'),
  accessKeyId: optional('R2_ACCESS_KEY_ID'),
  secretAccessKey: optional('R2_SECRET_ACCESS_KEY'),
  endpoint: optional('R2_ENDPOINT'),
  publicUrl: optional('R2_PUBLIC_URL'),
}

const r2Configured = Object.values(r2Values).some(Boolean)
const r2Complete = Object.values(r2Values).every(Boolean)

if (r2Configured && !r2Complete) {
  throw new Error(
    'R2 configuration is incomplete. Set R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, and R2_PUBLIC_URL.',
  )
}

const r2 =
  r2Configured && r2Complete
    ? {
        bucket: r2Values.bucket!,
        accessKeyId: r2Values.accessKeyId!,
        secretAccessKey: r2Values.secretAccessKey!,
        endpoint: requireHttpsUrl('R2_ENDPOINT', r2Values.endpoint!),
        publicUrl: requireHttpsUrl('R2_PUBLIC_URL', r2Values.publicUrl!),
      }
    : null

export const env = {
  databaseUrl,
  payloadSecret,
  r2,
}

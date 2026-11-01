import { postgresAdapter } from '@payloadcms/db-postgres'
import { s3Storage } from '@payloadcms/storage-s3'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { env } from './env'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Tags } from './collections/Tags'
import { Authors } from './collections/Authors'
import { Articles } from './collections/Articles'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const r2 = env.r2

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Categories, Tags, Authors, Articles],
  editor: lexicalEditor(),
  secret: env.payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.databaseUrl,
    },
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  storage: r2
    ? [
        s3Storage({
          enabled: true,
          collections: {
            media: {
              disablePayloadAccessControl: true,
              generateFileURL: ({ filename, prefix }) => {
                const key = prefix ? `${prefix}/${filename}` : filename
                const encodedKey = key.split('/').map(encodeURIComponent).join('/')
                return `${r2.publicUrl.replace(/\/+$/, '')}/${encodedKey}`
              },
            },
          },
          bucket: r2.bucket,
          clientUploads: true,
          config: {
            credentials: {
              accessKeyId: r2.accessKeyId,
              secretAccessKey: r2.secretAccessKey,
            },
            region: 'auto',
            endpoint: r2.endpoint,
            forcePathStyle: true,
          },
        }),
      ]
    : [],
  upload: {
    limits: { fileSize: 5_000_000 },
  },
  sharp,
  plugins: [],
})

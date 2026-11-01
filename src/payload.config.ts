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
  storage: env.r2
    ? [
        s3Storage({
          enabled: true,
          collections: {
            media: {
              disablePayloadAccessControl: true,
              generateFileURL: ({ filename, prefix }) => {
                const key = prefix ? `${prefix}/${filename}` : filename
                const encodedKey = key.split('/').map(encodeURIComponent).join('/')
                return `${env.r2!.publicUrl.replace(/\/+$/, '')}/${encodedKey}`
              },
            },
          },
          bucket: env.r2.bucket,
          clientUploads: true,
          config: {
            credentials: {
              accessKeyId: env.r2.accessKeyId,
              secretAccessKey: env.r2.secretAccessKey,
            },
            region: 'auto',
            endpoint: env.r2.endpoint,
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

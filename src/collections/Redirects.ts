import type { CollectionConfig } from 'payload'

import { isAdminOrEditor } from '@/access'

const rootArticlePath = (value: unknown): true | string => {
  if (typeof value !== 'string' || !/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return 'Use a root-level article path, for example /old-article-title.'
  }

  return true
}

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  admin: {
    useAsTitle: 'fromPath',
    defaultColumns: ['fromPath', 'toPath', 'statusCode', 'updatedAt'],
    description: 'Permanent redirects for previously published article URLs.',
  },
  access: {
    read: isAdminOrEditor,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    {
      name: 'fromPath',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: rootArticlePath,
    },
    {
      name: 'toPath',
      type: 'text',
      required: true,
      validate: rootArticlePath,
    },
    {
      name: 'statusCode',
      type: 'select',
      required: true,
      defaultValue: '308',
      options: [
        { label: '301 — Moved Permanently', value: '301' },
        { label: '308 — Permanent Redirect', value: '308' },
      ],
    },
  ],
}

import { APIError, type CollectionBeforeValidateHook } from 'payload'

import { hasRole } from '@/access'
import type { Article } from '@/payload-types'

function fail(message: string): never {
  throw new APIError(message, 400, undefined, true)
}

const hasText = (node: unknown): boolean => {
  if (!node || typeof node !== 'object') return false
  const { text, children } = node as { text?: unknown; children?: unknown }
  if (typeof text === 'string' && text.trim() !== '') return true
  return Array.isArray(children) && children.some(hasText)
}

const missingForPublication = (doc: Partial<Article>): string[] => {
  const missing: string[] = []
  if (!doc.featuredImage) missing.push('imagen destacada')
  if (!doc.excerpt?.trim()) missing.push('resumen')
  if (!hasText((doc.body as { root?: unknown } | null | undefined)?.root)) missing.push('contenido')
  return missing
}

const sameInstant = (a: string | null | undefined, b: string | null | undefined): boolean =>
  Boolean(a) && Boolean(b) && new Date(a as string).getTime() === new Date(b as string).getTime()

export const enforcePublicationRules: CollectionBeforeValidateHook<Article> = ({
  data,
  originalDoc,
  req,
}) => {
  if (!data || !req.user) return data

  if (!hasRole(req.user, 'admin', 'editor')) {
    const { publishedAt: _ignored, ...rest } = data
    return rest
  }

  const now = new Date()
  const from = originalDoc?.editorialStatus
  const status = data.editorialStatus ?? from ?? 'draft'
  const stored = originalDoc?.publishedAt ?? null
  const locked = stored !== null && new Date(stored).getTime() <= now.getTime()

  if (status === 'published' || status === 'scheduled') {
    const missing = missingForPublication({ ...originalDoc, ...data })
    if (missing.length > 0) fail(`Para publicar o programar hace falta: ${missing.join(', ')}.`)
  }

  if (locked) {
    if (status === 'scheduled' && from !== 'scheduled') {
      fail('Un artículo ya publicado no se puede reprogramar; vuelva a publicarlo.')
    }
    if (data.publishedAt !== undefined && !sameInstant(data.publishedAt, stored)) {
      fail('La fecha de primera publicación no se puede modificar.')
    }
    return { ...data, publishedAt: stored }
  }

  if (status === 'published') return { ...data, publishedAt: now.toISOString() }

  if (status === 'scheduled') {
    const candidate = data.publishedAt !== undefined ? data.publishedAt : stored
    if (!candidate || new Date(candidate).getTime() <= now.getTime()) {
      fail('La fecha de programación debe ser futura.')
    }
    return { ...data, publishedAt: new Date(candidate).toISOString() }
  }
  return { ...data, publishedAt: null }
}

import { APIError, type CollectionBeforeValidateHook } from 'payload'

import type { Redirect } from '@/payload-types'

const fail = (message: string): never => {
  throw new APIError(message, 400, undefined, true)
}

export const validateRedirectPaths: CollectionBeforeValidateHook<Redirect> = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) return data

  const { fromPath, toPath } = data
  if (typeof fromPath !== 'string' || typeof toPath !== 'string') return data

  if (fromPath === toPath) {
    fail('La URL de origen y destino no pueden ser iguales.')
  }

  // A redirect must never point to another redirect (chain), or create a cycle.
  const targetIsRedirect = await req.payload.find({
    collection: 'redirects',
    where: {
      and: [
        { fromPath: { equals: toPath } },
        ...(originalDoc ? [{ id: { not_equals: originalDoc.id } }] : []),
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (targetIsRedirect.totalDocs > 0) {
    fail('El destino ya es una URL redirigida. Apuntá directamente al artículo final.')
  }

  const sourceHasIncomingRedirects = await req.payload.find({
    collection: 'redirects',
    where: {
      and: [
        { toPath: { equals: fromPath } },
        ...(originalDoc ? [{ id: { not_equals: originalDoc.id } }] : []),
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (sourceHasIncomingRedirects.totalDocs > 0) {
    fail('Esta URL ya es destino de otro redirect. Actualizá primero los redirects anteriores.')
  }

  const sourceArticle = await req.payload.find({
    collection: 'articles',
    where: { slug: { equals: fromPath.slice(1) } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (sourceArticle.totalDocs > 0) {
    fail('La URL de origen pertenece a un artículo existente.')
  }

  const targetArticle = await req.payload.find({
    collection: 'articles',
    where: {
      and: [
        { slug: { equals: toPath.slice(1) } },
        { editorialStatus: { in: ['published', 'scheduled'] } },
        { publishedAt: { less_than_equal: new Date().toISOString() } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (targetArticle.totalDocs === 0) {
    fail('El destino debe ser la URL de un artículo publicado.')
  }

  return data
}

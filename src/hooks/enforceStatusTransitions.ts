import { APIError, type CollectionBeforeValidateHook } from 'payload'

import { hasRole } from '@/access'
import type { Article } from '@/payload-types'

type Status = Article['editorialStatus']

const EDITOR_TRANSITIONS: Record<Status, Status[]> = {
  draft: ['in_review'],
  in_review: ['draft', 'rejected', 'scheduled', 'published'],
  rejected: ['draft', 'in_review', 'archived'],
  scheduled: ['draft', 'published', 'archived'],
  published: ['draft', 'archived'],
  archived: ['draft'],
}

const JOURNALIST_TRANSITIONS: Partial<Record<Status, Status[]>> = {
  draft: ['in_review'],
  rejected: ['in_review'],
}

const deny = (message: string): never => {
  throw new APIError(message, 403, undefined, true)
}

const relationId = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) {
    return String((value as { id: string | number }).id)
  }
  return undefined
}

// Domain workflow validation is independent of Payload access control.
// Local API calls with overrideAccess still have to obey these transitions.
export const enforceStatusTransitions: CollectionBeforeValidateHook<Article> = ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) return data

  const isEditor = hasRole(req.user, 'admin', 'editor')
  const isJournalist = hasRole(req.user, 'journalist')

  if (req.user && !isEditor && !isJournalist) {
    deny('El usuario no tiene permisos para operar sobre artículos.')
  }

  if (operation === 'create') {
    const initialStatus = data.editorialStatus ?? 'draft'
    if (initialStatus !== 'draft') {
      deny('Un artículo debe crearse como borrador y pasar por revisión antes de publicarse o programarse.')
    }
    return data
  }

  if (operation !== 'update' || !originalDoc) return data

  const from = originalDoc.editorialStatus
  const to = data.editorialStatus

  if (!req.user) {
    if (from !== 'draft') {
      deny('Las operaciones sin usuario autenticado solo pueden modificar borradores.')
    }
    if (to && to !== from) {
      deny('Se requiere un usuario autorizado para cambiar el estado editorial.')
    }
    return data
  }

  if (isJournalist) {
    if (from !== 'draft' && from !== 'rejected') {
      deny('Los periodistas no pueden modificar artículos después de enviarlos a revisión.')
    }
    if (relationId(originalDoc.createdBy) !== String(req.user.id)) {
      deny('Los periodistas solo pueden modificar sus propios borradores.')
    }
  }

  if (!to || to === from) return data

  const allowed = isEditor
    ? EDITOR_TRANSITIONS[from]
    : isJournalist
      ? JOURNALIST_TRANSITIONS[from]
      : undefined

  if (!allowed?.includes(to)) {
    deny(`Transición no permitida: ${from} → ${to}`)
  }

  return data
}

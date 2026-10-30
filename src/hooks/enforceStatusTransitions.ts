import { APIError, type CollectionBeforeValidateHook } from 'payload'

import { hasRole } from '@/access'
import type { Article } from '@/payload-types'

type Status = Article['editorialStatus']

const EDITOR_TRANSITIONS: Record<Status, Status[]> = {
  draft: ['in_review', 'scheduled', 'published', 'archived'],
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

// Runs on the server for every update, whatever the client sends.
export const enforceStatusTransitions: CollectionBeforeValidateHook<Article> = ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  // No user means trusted server code: anonymous requests are stopped earlier by access control.
  if (!data || !req.user) return data
  // Creation: only editors and admins can set a status (field access strips it for others).
  if (operation !== 'update' || !originalDoc) return data

  const from = originalDoc.editorialStatus
  const to = data.editorialStatus
  if (!to || to === from) return data

  const allowed = hasRole(req.user, 'admin', 'editor')
    ? EDITOR_TRANSITIONS[from]
    : hasRole(req.user, 'journalist')
      ? JOURNALIST_TRANSITIONS[from]
      : undefined

  if (!allowed?.includes(to)) {
    throw new APIError(`Transición no permitida: ${from} → ${to}`, 403, undefined, true)
  }
  return data
}

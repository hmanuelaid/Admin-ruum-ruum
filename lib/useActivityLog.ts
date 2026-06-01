import { useCallback } from 'react'

type Entity = 'trip' | 'driver' | 'user' | 'payment' | 'incident' | 'document' | 'config' | 'admin'
type Action = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'assign' | 'escalate' | 'resolve' | 'login' | 'logout' | 'export'

interface LogParams {
  action: Action
  entity?: Entity
  entityId?: string
  detail?: string
}

export function useActivityLog() {
  const log = useCallback(async ({ action, entity, entityId, detail }: LogParams) => {
    try {
      await fetch('/api/admin/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          entity,
          entityId,
          detail,
        }),
      })
    } catch {
      // La bitácora nunca debe romper el flujo principal
    }
  }, [])

  return { log }
}

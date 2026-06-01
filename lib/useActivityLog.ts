import { useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'

type Entity = 'trip' | 'driver' | 'user' | 'payment' | 'incident' | 'document' | 'config' | 'admin'
type Action = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'assign' | 'escalate' | 'resolve' | 'login' | 'logout' | 'export'

interface LogParams {
  action: Action
  entity?: Entity
  entityId?: string
  detail?: string
}

export function useActivityLog() {
  const { admin } = useAuthStore()

  const log = useCallback(async ({ action, entity, entityId, detail }: LogParams) => {
    try {
      const supabase = createClient()
      await supabase.from('admin_activity_log').insert({
        admin_id:   admin?.id   ?? null,
        admin_name: admin?.name ?? null,
        action,
        entity:     entity   ?? null,
        entity_id:  entityId ?? null,
        detail:     detail   ?? null,
      })
    } catch {
      // La bitácora nunca debe romper el flujo principal
    }
  }, [admin])

  return { log }
}
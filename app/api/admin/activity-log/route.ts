import { NextResponse } from 'next/server'
import { getVerifiedAdmin } from '@/lib/auth/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type Entity = 'trip' | 'driver' | 'user' | 'payment' | 'incident' | 'document' | 'config' | 'admin'
type Action = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'assign' | 'escalate' | 'resolve' | 'login' | 'logout' | 'export'

const ACTIONS = new Set<Action>([
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'assign',
  'escalate',
  'resolve',
  'login',
  'logout',
  'export',
])

const ENTITIES = new Set<Entity>([
  'trip',
  'driver',
  'user',
  'payment',
  'incident',
  'document',
  'config',
  'admin',
])

type LogBody = {
  action?: unknown
  entity?: unknown
  entityId?: unknown
  detail?: unknown
}

export async function POST(request: Request) {
  const admin = await getVerifiedAdmin()

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: LogBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.action !== 'string' || !ACTIONS.has(body.action as Action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (body.entity != null && (typeof body.entity !== 'string' || !ENTITIES.has(body.entity as Entity))) {
    return NextResponse.json({ error: 'Invalid entity' }, { status: 400 })
  }

  const action = body.action as Action
  const entity = body.entity == null ? null : (body.entity as Entity)
  const entityId = typeof body.entityId === 'string' && body.entityId.trim() ? body.entityId.trim() : null
  const detail = typeof body.detail === 'string' && body.detail.trim() ? body.detail.trim().slice(0, 1000) : null
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('log_admin_activity', {
    p_action: action,
    p_entity: entity,
    p_entity_id: entityId,
    p_detail: detail,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import {
  getDefaultConfigItems,
  getSystemConfigKeys,
  mergeConfigRows,
  validateSystemConfigValue,
  type SystemConfigRow,
} from '@/lib/config/system-config'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type SupabaseErrorLike = {
  code?: string
  message: string
}

type ConfigPayload = {
  items?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function configSourceProblem(error: SupabaseErrorLike) {
  if (error.code === '42P01') {
    return {
      status: 503,
      code: error.code,
      message: 'La tabla system_config no existe. Aplica las migraciones pendientes antes de editar configuracion.',
    }
  }

  if (error.code === '42501') {
    return {
      status: 403,
      code: error.code,
      message: 'Supabase denego acceso a system_config. Revisa RLS, rol y permisos antes de guardar.',
    }
  }

  return {
    status: 502,
    code: error.code ?? 'UNKNOWN',
    message: `No se pudo leer system_config: ${error.message}`,
  }
}

export async function GET() {
  const { response } = await authorizeAdminAction('config.read')
  if (response) return response

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('system_config')
    .select('id, key, value')
    .in('key', getSystemConfigKeys())

  if (error) {
    const problem = configSourceProblem(error)
    return NextResponse.json({
      configs: getDefaultConfigItems(),
      sourceAvailable: false,
      error: {
        code: problem.code,
        message: problem.message,
      },
    }, { status: problem.status })
  }

  return NextResponse.json({
    configs: mergeConfigRows((data ?? []) as SystemConfigRow[]),
    sourceAvailable: true,
    error: null,
  })
}

export async function POST(request: Request) {
  const { response } = await authorizeAdminAction('config.write')
  if (response) return response

  let body: ConfigPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 })
  }

  if (body.items.length === 0) {
    return NextResponse.json({ saved: 0 })
  }

  if (body.items.length > 50) {
    return NextResponse.json({ error: 'Too many config items' }, { status: 400 })
  }

  const errors: Record<string, string> = {}
  const items = body.items.flatMap(item => {
    if (!isRecord(item) || typeof item.key !== 'string') {
      errors._payload = 'Invalid config item'
      return []
    }

    const result = validateSystemConfigValue(item.key, item.value)
    if (!result.ok) {
      errors[item.key] = result.error
      return []
    }

    return [{ key: item.key, value: result.value }]
  })

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'Invalid system config', errors }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('upsert_system_config_values', {
    p_items: items,
  })

  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json({ saved: items.length })
}

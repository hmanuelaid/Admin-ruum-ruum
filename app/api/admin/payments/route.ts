import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PAY_STATUSES = new Set([
  'pendiente',
  'en_revision',
  'aprobado',
  'rechazado',
  'pagado',
  'revocado',
  'ajustado',
])

const PAY_TYPES = new Set([
  'cobro_usuario',
  'pago_conductor',
  'gasto',
])

function getBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

export async function GET(request: Request) {
  const { response } = await authorizeAdminAction('payments.read')
  if (response) return response

  const url = new URL(request.url)
  const status = url.searchParams.get('status') || null
  const type = url.searchParams.get('type') || null
  const search = (url.searchParams.get('search') ?? '').trim().slice(0, 120)
  const page = getBoundedInt(url.searchParams.get('page'), 1, 1, 10000)
  const pageSize = getBoundedInt(url.searchParams.get('pageSize'), 25, 1, 100)
  const offset = (page - 1) * pageSize

  if (status && !PAY_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
  }

  if (type && !PAY_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const [summaryResult, totalResult, pageResult] = await Promise.all([
    supabase.rpc('get_admin_payment_summary'),
    supabase.rpc('get_admin_payments_total', {
      p_status: status,
      p_type: type,
      p_search: search || null,
    }),
    supabase.rpc('get_admin_payments_page', {
      p_status: status,
      p_type: type,
      p_search: search || null,
      p_limit: pageSize,
      p_offset: offset,
    }),
  ])

  const error = summaryResult.error ?? totalResult.error ?? pageResult.error
  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json({
    payments: pageResult.data ?? [],
    metrics: summaryResult.data ?? { pendientes: 0, pagados: 0, totalPagado: 0, rechazados: 0 },
    total: totalResult.data ?? 0,
    page,
    pageSize,
  })
}

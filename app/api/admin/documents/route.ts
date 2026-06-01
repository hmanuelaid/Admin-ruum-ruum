import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const DOC_STATUSES = new Set([
  'pendiente_carga',
  'en_revision',
  'aprobado',
  'rechazado',
  'vencido',
  'requiere_actualizacion',
])

function getBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

export async function GET(request: Request) {
  const { response } = await authorizeAdminAction('documents.read')
  if (response) return response

  const url = new URL(request.url)
  const rawStatus = url.searchParams.get('status')
  const status = rawStatus && rawStatus !== 'todos' ? rawStatus : null
  const search = (url.searchParams.get('search') ?? '').trim().slice(0, 120)
  const page = getBoundedInt(url.searchParams.get('page'), 1, 1, 10000)
  const pageSize = getBoundedInt(url.searchParams.get('pageSize'), 25, 1, 100)
  const offset = (page - 1) * pageSize

  if (status && !DOC_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid document status' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const [countsResult, totalResult, pageResult] = await Promise.all([
    supabase.rpc('get_admin_document_status_counts'),
    supabase.rpc('get_admin_documents_total', {
      p_status: status,
      p_search: search || null,
    }),
    supabase.rpc('get_admin_documents_page', {
      p_status: status,
      p_search: search || null,
      p_limit: pageSize,
      p_offset: offset,
    }),
  ])

  const error = countsResult.error ?? totalResult.error ?? pageResult.error
  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json({
    documents: pageResult.data ?? [],
    counts: countsResult.data ?? { todos: 0, en_revision: 0, aprobado: 0, rechazado: 0 },
    total: totalResult.data ?? 0,
    page,
    pageSize,
  })
}

import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
const COMPANY_TYPES = new Set(['agencia', 'lote', 'arrendadora', 'flotilla', 'taller', 'aseguradora', 'otro'])
const COMPANY_STATUSES = new Set(['activo', 'suspendido'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COMPANY_SELECT = 'id, nombre, razon_social, rfc, contact_name, phone, email, type, status, trips_count, created_at, updated_at'

type CompanyPatchPayload = {
  name?: unknown
  businessName?: unknown
  rfc?: unknown
  contactName?: unknown
  phone?: unknown
  email?: unknown
  type?: unknown
  status?: unknown
}

type RouteContext = {
  params: Promise<{ id: string }>
}

type CompanyDbRow = {
  id: string
  nombre: string
  razon_social: string
  rfc: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  type: string | null
  status: string
  trips_count: number | null
  created_at: string
  updated_at: string
}

function mapCompany(row: CompanyDbRow) {
  return {
    id: row.id,
    name: row.nombre,
    business_name: row.razon_social,
    rfc: row.rfc ?? '',
    contact_name: row.contact_name ?? '',
    phone: row.phone,
    email: row.email ?? '',
    type: row.type ?? 'otro',
    status: row.status,
    trips_count: row.trips_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : undefined
}

function buildPatch(body: CompanyPatchPayload) {
  const patch: Record<string, string | null> = {}

  const name = cleanText(body.name, 120)
  if (name !== undefined) {
    if (!name) return { error: 'Company name is required' }
    patch.nombre = name
  }

  const businessName = cleanText(body.businessName, 180)
  if (businessName !== undefined) {
    if (!businessName) return { error: 'Business name is required' }
    patch.razon_social = businessName
  }

  const rfc = cleanText(body.rfc, 20)?.toUpperCase().replace(/\s+/g, '')
  if (rfc !== undefined) {
    if (!/^[A-ZÑ&0-9]{12,13}$/i.test(rfc)) return { error: 'Invalid RFC' }
    patch.rfc = rfc
  }

  const contactName = cleanText(body.contactName, 120)
  if (contactName !== undefined) {
    if (!contactName) return { error: 'Contact name is required' }
    patch.contact_name = contactName
  }

  const phone = cleanText(body.phone, 30)
  if (phone !== undefined) patch.phone = phone || null

  const email = cleanText(body.email, 160)?.toLowerCase()
  if (email !== undefined) {
    if (!EMAIL_RE.test(email)) return { error: 'Invalid email' }
    patch.email = email
  }

  const type = cleanText(body.type, 40)
  if (type !== undefined) {
    if (!COMPANY_TYPES.has(type)) return { error: 'Invalid company type' }
    patch.type = type
  }

  const status = cleanText(body.status, 20)
  if (status !== undefined) {
    if (!COMPANY_STATUSES.has(status)) return { error: 'Invalid company status' }
    patch.status = status
  }

  if (Object.keys(patch).length === 0) return { error: 'No changes provided' }
  return { patch }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { response } = await authorizeAdminAction('companies.write')
  if (response) return response

  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid company id' }, { status: 400 })
  }

  let body: CompanyPatchPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = buildPatch(body)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('companies')
    .update(result.patch)
    .eq('id', id)
    .select(COMPANY_SELECT)
    .single()

  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json({ company: mapCompany(data as CompanyDbRow) })
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { response } = await authorizeAdminAction('companies.write')
  if (response) return response

  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid company id' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('companies').delete().eq('id', id)

  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json({ ok: true })
}

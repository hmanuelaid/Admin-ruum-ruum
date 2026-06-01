import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const COMPANY_TYPES = new Set(['agencia', 'lote', 'arrendadora', 'flotilla', 'taller', 'aseguradora', 'otro'])
const COMPANY_STATUSES = new Set(['activo', 'suspendido'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COMPANY_SELECT = 'id, nombre, razon_social, rfc, contact_name, phone, email, type, status, trips_count, created_at, updated_at'

type CompanyPayload = {
  name?: unknown
  businessName?: unknown
  rfc?: unknown
  contactName?: unknown
  phone?: unknown
  email?: unknown
  type?: unknown
  status?: unknown
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

function getBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function sanitizeSearch(value: string) {
  return value.replace(/[%,*()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}

function validateCompanyPayload(body: CompanyPayload) {
  const name = cleanText(body.name, 120)
  const businessName = cleanText(body.businessName, 180)
  const rfc = cleanText(body.rfc, 20).toUpperCase().replace(/\s+/g, '')
  const contactName = cleanText(body.contactName, 120)
  const phone = cleanText(body.phone, 30)
  const email = cleanText(body.email, 160).toLowerCase()
  const type = cleanText(body.type, 40)
  const status = cleanText(body.status, 20) || 'activo'

  if (!name) return { error: 'Company name is required' }
  if (!businessName) return { error: 'Business name is required' }
  if (!/^[A-ZÑ&0-9]{12,13}$/i.test(rfc)) return { error: 'Invalid RFC' }
  if (!contactName) return { error: 'Contact name is required' }
  if (!EMAIL_RE.test(email)) return { error: 'Invalid email' }
  if (!COMPANY_TYPES.has(type)) return { error: 'Invalid company type' }
  if (!COMPANY_STATUSES.has(status)) return { error: 'Invalid company status' }

  return {
    payload: {
      nombre: name,
      razon_social: businessName,
      rfc,
      contact_name: contactName,
      phone: phone || null,
      email,
      type,
      status,
    },
  }
}

export async function GET(request: Request) {
  const { response } = await authorizeAdminAction('companies.read')
  if (response) return response

  const url = new URL(request.url)
  const search = sanitizeSearch(url.searchParams.get('search') ?? '')
  const type = url.searchParams.get('type') || null
  const status = url.searchParams.get('status') || null
  const page = getBoundedInt(url.searchParams.get('page'), 1, 1, 10000)
  const pageSize = getBoundedInt(url.searchParams.get('pageSize'), 25, 1, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  if (type && !COMPANY_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid company type' }, { status: 400 })
  }

  if (status && !COMPANY_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid company status' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('companies')
    .select(COMPANY_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (type) query = query.eq('type', type)
  if (status) query = query.eq('status', status)
  if (search) {
    const like = `%${search}%`
    query = query.or(`nombre.ilike.${like},razon_social.ilike.${like},rfc.ilike.${like},contact_name.ilike.${like},email.ilike.${like}`)
  }

  const [summaryResult, companiesResult] = await Promise.all([
    supabase.rpc('get_admin_companies_summary'),
    query,
  ])

  const error = summaryResult.error ?? companiesResult.error
  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json({
    companies: ((companiesResult.data ?? []) as CompanyDbRow[]).map(mapCompany),
    summary: summaryResult.data ?? { total: 0, activas: 0, suspendidas: 0, viajesTotal: 0 },
    total: companiesResult.count ?? 0,
    page,
    pageSize,
  })
}

export async function POST(request: Request) {
  const { response } = await authorizeAdminAction('companies.write')
  if (response) return response

  let body: CompanyPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = validateCompanyPayload(body)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('companies')
    .insert(result.payload)
    .select(COMPANY_SELECT)
    .single()

  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json({ company: mapCompany(data as CompanyDbRow) }, { status: 201 })
}

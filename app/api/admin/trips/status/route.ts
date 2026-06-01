import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const TRIP_STATUSES = new Set([
  'solicitud_recibida',
  'pendiente_revision',
  'pendiente_asignacion',
  'conductor_asignado',
  'conductor_en_camino',
  'recoleccion_proceso',
  'evidencia_inicial_pendiente',
  'traslado_curso',
  'entrega_proceso',
  'evidencia_final_pendiente',
  'finalizado',
  'cancelado',
  'incidente',
])

type TripStatusBody = {
  tripId?: unknown
  status?: unknown
  expectedStatus?: unknown
}

export async function POST(request: Request) {
  const { response } = await authorizeAdminAction('trips.update_status')
  if (response) return response

  let body: TripStatusBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.tripId !== 'string' || body.tripId.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid trip id' }, { status: 400 })
  }

  if (typeof body.status !== 'string' || !TRIP_STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'Invalid trip status' }, { status: 400 })
  }

  if (body.expectedStatus != null && (typeof body.expectedStatus !== 'string' || !TRIP_STATUSES.has(body.expectedStatus))) {
    return NextResponse.json({ error: 'Invalid expected status' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('update_trip_status_atomic', {
    p_trip_id: body.tripId.trim(),
    p_status: body.status,
    p_expected_status: body.expectedStatus ?? null,
  })

  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json({ ok: true, data })
}

import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type AssignDriverBody = {
  tripId?: unknown
  driverId?: unknown
}

export async function POST(request: Request) {
  const { response } = await authorizeAdminAction('trips.assign_driver')
  if (response) return response

  let body: AssignDriverBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.tripId !== 'string' || body.tripId.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid trip id' }, { status: 400 })
  }

  if (typeof body.driverId !== 'string' || !UUID_RE.test(body.driverId)) {
    return NextResponse.json({ error: 'Invalid driver id' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('assign_trip_driver', {
    p_trip_id: body.tripId.trim(),
    p_driver_id: body.driverId,
  })

  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json({ ok: true, data })
}

import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PAY_STATUSES = new Set(['pagado', 'rechazado', 'ajustado'])

type PaymentStatusBody = {
  paymentIds?: unknown
  status?: unknown
}

export async function POST(request: Request) {
  const { response } = await authorizeAdminAction('payments.update_status')
  if (response) return response

  let body: PaymentStatusBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body.paymentIds) || body.paymentIds.length === 0 || body.paymentIds.some(id => typeof id !== 'string' || !UUID_RE.test(id))) {
    return NextResponse.json({ error: 'Invalid payment ids' }, { status: 400 })
  }

  if (typeof body.status !== 'string' || !PAY_STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('update_payment_statuses_atomic', {
    p_payment_ids: Array.from(new Set(body.paymentIds)),
    p_status: body.status,
  })

  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json({ ok: true, data })
}

import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { response } = await authorizeAdminAction('dashboard.read')
  if (response) return response

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('get_admin_dashboard_summary')

  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json(data ?? {})
}

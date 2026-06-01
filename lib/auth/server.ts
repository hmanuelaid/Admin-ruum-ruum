import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { AdminUser } from '@/lib/types'
import { isAdminRole } from './permissions'

type AdminRow = {
  id: string
  name: string | null
  email: string | null
  role: string | null
}

export async function getVerifiedAdmin(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data, error } = await supabase
    .from('admin_users')
    .select('id, name, email, role')
    .eq('auth_id', user.id)
    .eq('active', true)
    .maybeSingle()

  const admin = data as AdminRow | null
  if (error || !admin || !isAdminRole(admin.role)) return null

  return {
    id: admin.id,
    name: admin.name ?? user.email ?? 'Admin',
    email: admin.email ?? user.email ?? '',
    role: admin.role,
  }
}

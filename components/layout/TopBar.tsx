'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import type { VisibleAdminNavGroup } from '@/lib/auth/permissions'
import type { AdminRole, AdminUser } from '@/lib/types'
import MobileAdminNav from './MobileAdminNav'

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin', admin_operativo: 'Admin Operativo',
  finanzas: 'Finanzas', soporte: 'Soporte',
  validador: 'Validador', comercial: 'Comercial',
}

type Props = {
  admin: AdminUser
  navGroups: VisibleAdminNavGroup[]
}

export default function Topbar({ admin, navGroups }: Props) {
  const router = useRouter()
  const { logout } = useAuthStore()
  const [signingOut, setSigningOut] = useState(false)
  const initials = admin.name
    .split(/\s+/)
    .flatMap(part => part ? [part[0]] : [])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AD'

  async function handleLogout() {
    if (signingOut) return
    setSigningOut(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Supabase signOut failed', error)
      setSigningOut(false)
      return
    }

    logout()
    router.replace('/login')
    router.refresh()
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <MobileAdminNav navGroups={navGroups} />
      </div>

      <div className="topbar-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{admin.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ROLE_LABELS[admin.role]}</p>
          </div>
          <button className="admin-avatar" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión" disabled={signingOut}>
            {initials}
          </button>
        </div>
      </div>
    </header>
  )
}

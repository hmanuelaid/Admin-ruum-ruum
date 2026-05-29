'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard', '/viajes': 'Viajes', '/usuarios': 'Usuarios',
  '/conductores': 'Conductores', '/evidencia': 'Evidencia',
  '/incidencias': 'Incidencias', '/pagos': 'Pagos',
  '/documentos': 'Documentos', '/tarifas': 'Tarifas',
  '/empresas': 'Empresas', '/reportes': 'Reportes',
  '/configuracion': 'Configuración',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', admin_operativo: 'Admin Operativo',
  finanzas: 'Finanzas', soporte: 'Soporte',
  validador: 'Validador', comercial: 'Comercial',
}

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { admin, logout } = useAuthStore()

  function handleLogout() {
    logout()
    router.replace('/login')
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="search-box">
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Buscar viaje, conductor, usuario…" />
        </div>
      </div>

      <div className="topbar-right">
        <button className="btn-icon dot-badge" aria-label="Alertas">
          <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
            <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
          </svg>
        </button>

        {admin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{admin.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ROLE_LABELS[admin.role]}</p>
            </div>
            <button className="admin-avatar" onClick={handleLogout} title="Cerrar sesión">
              👤
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
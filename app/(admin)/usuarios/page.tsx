'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Chip } from '@/components/ui/Chip'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import type { UserType } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  personal: 'Personal', empresarial: 'Empresarial', agencia: 'Agencia',
  lote: 'Lote', flotilla: 'Flotilla', arrendadora: 'Arrendadora',
  taller: 'Taller', aseguradora: 'Aseguradora',
}

type UserStatus = 'activo' | 'suspendido'

interface AppUserRow {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  type: UserType | string | null
  status: UserStatus | string | null
  trips_count: number | null
  created_at: string | null
  company: string | null
}

export default function UsuariosPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [users, setUsers] = useState<AppUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { showToast } = useAppStore()

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function loadUsers() {
      setLoading(true)
      setError('')

      const { data, error: loadError } = await supabase
        .from('app_users')
        .select('id, name, email, phone, type, status, trips_count, created_at, company')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (loadError) {
        setError(loadError.message)
        setUsers([])
        showToast(`No se pudieron cargar usuarios: ${loadError.message}`)
      } else {
        setUsers((data ?? []) as AppUserRow[])
      }

      setLoading(false)
    }

    void loadUsers()

    const channel = supabase
      .channel('admin-app-users')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'app_users',
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setUsers(prev => [payload.new as AppUserRow, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setUsers(prev => prev.map(user =>
            user.id === (payload.new as AppUserRow).id ? payload.new as AppUserRow : user
          ))
        } else if (payload.eventType === 'DELETE') {
          setUsers(prev => prev.filter(user => user.id !== (payload.old as AppUserRow).id))
        }
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [showToast])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter(user => {
      const matchSearch =
        !query ||
        (user.name ?? '').toLowerCase().includes(query) ||
        (user.email ?? '').toLowerCase().includes(query) ||
        (user.phone ?? '').includes(query) ||
        (user.company ?? '').toLowerCase().includes(query)
      const matchType = !typeFilter || user.type === typeFilter
      const matchStatus = !statusFilter || user.status === statusFilter
      return matchSearch && matchType && matchStatus
    })
  }, [search, statusFilter, typeFilter, users])

  const counts = useMemo(() => ({
    total: users.length,
    activos: users.filter(u => u.status === 'activo').length,
    empresariales: users.filter(u => u.type && u.type !== 'personal').length,
    suspendidos: users.filter(u => u.status === 'suspendido').length,
  }), [users])

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-sub">
            {loading ? 'Cargando usuarios…' : `${counts.total} usuarios registrados`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Invitar usuario — próximamente')}>
          + Invitar usuario
        </button>
      </div>

      <div className="metrics-grid">
        {[
          { label: 'Total',         value: counts.total,         icon: '👥' },
          { label: 'Activos',       value: counts.activos,       icon: '✅' },
          { label: 'Empresariales', value: counts.empresariales, icon: '🏢' },
          { label: 'Suspendidos',   value: counts.suspendidos,   icon: '🚫' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="icon" style={{ background: 'var(--primary-dim)', fontSize: '1.1rem' }}>{m.icon}</div>
            <p className="value">{m.value}</p>
            <p className="label">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <div className="filter-search">
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Buscar por nombre, correo o teléfono…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Cualquier estatus</option>
          <option value="activo">Activo</option>
          <option value="suspendido">Suspendido</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Usuario</th><th>Contacto</th><th>Tipo</th>
              <th>Viajes</th><th>Registro</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}>
                <div className="empty-state"><p className="muted">Cargando usuarios…</p></div>
              </td></tr>
            ) : error ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <span className="icon">⚠️</span>
                  <p style={{ fontWeight: 600 }}>No se pudieron cargar usuarios</p>
                  <p className="muted">{error}</p>
                </div>
              </td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <span className="icon">👤</span>
                  <p style={{ fontWeight: 600 }}>Sin usuarios</p>
                  <p className="muted">No hay registros que coincidan con los filtros.</p>
                </div>
              </td></tr>
            ) : filteredUsers.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-dim)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      👤
                    </div>
                    <div>
                      <p className="td-bold">{u.name ?? 'Sin nombre'}</p>
                      {u.company && <span className="td-muted">{u.company}</span>}
                    </div>
                  </div>
                </td>
                <td>
                  <p style={{ fontSize: 13 }}>{u.email ?? '—'}</p>
                  <span className="td-muted">{u.phone ?? 'Sin teléfono'}</span>
                </td>
                <td><Chip variant="primary">{TYPE_LABELS[u.type ?? ''] ?? 'Sin tipo'}</Chip></td>
                <td className="td-bold">{u.trips_count ?? 0}</td>
                <td className="td-muted">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('es-MX') : '—'}
                </td>
                <td>
                  <Chip status={u.status === 'activo' ? 'activo' : 'suspendido'}>
                    {u.status === 'activo' ? 'Activo' : 'Suspendido'}
                  </Chip>
                </td>
                <td>
                  <div className="td-actions">
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => router.push(`/usuarios/${u.id}`)}>Ver</button>
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => router.push(`/usuarios/${u.id}`)}>Viajes</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

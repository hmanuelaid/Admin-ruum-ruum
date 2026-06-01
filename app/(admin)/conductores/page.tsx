'use client'
import { useEffect, useMemo, useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import type { DriverStatus } from '@/lib/types'
import { useRouter } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = {
  disponible: 'Disponible', en_viaje: 'En viaje',
  pendiente_validacion: 'Pendiente', activo: 'Activo',
  no_disponible: 'No disponible', suspendido: 'Suspendido',
  bloqueado: 'Bloqueado', documentacion_vencida: 'Doc. vencida',
}
interface DriverRow {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  state: string | null
  status: DriverStatus | string | null
  certified: boolean | null
  rating: number | null
  trips_completed: number | null
  earnings: number | null
  photo_url: string | null
  created_at: string | null
}

export default function ConductoresPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [drivers, setDrivers] = useState<DriverRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { showToast } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function loadDrivers() {
      setLoading(true)
      setError('')

      const { data, error: loadError } = await supabase
        .from('drivers')
        .select('id, name, phone, email, state, status, certified, rating, trips_completed, earnings, photo_url, created_at')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (loadError) {
        setError(loadError.message)
        setDrivers([])
        showToast(`No se pudieron cargar conductores: ${loadError.message}`)
      } else {
        setDrivers((data ?? []) as DriverRow[])
      }

      setLoading(false)
    }

    void loadDrivers()

    const channel = supabase
      .channel('admin-drivers')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'drivers',
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setDrivers(prev => [payload.new as DriverRow, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setDrivers(prev => prev.map(driver =>
            driver.id === (payload.new as DriverRow).id ? payload.new as DriverRow : driver
          ))
        } else if (payload.eventType === 'DELETE') {
          setDrivers(prev => prev.filter(driver => driver.id !== (payload.old as DriverRow).id))
        }
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [showToast])

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return drivers.filter(driver => {
      const matchSearch =
        !query ||
        (driver.name ?? '').toLowerCase().includes(query) ||
        (driver.phone ?? '').includes(query) ||
        (driver.email ?? '').toLowerCase().includes(query) ||
        (driver.state ?? '').toLowerCase().includes(query)

      const matchStatus = !statusFilter || driver.status === statusFilter
      const matchState = !stateFilter || driver.state === stateFilter

      return matchSearch && matchStatus && matchState
    })
  }, [drivers, search, stateFilter, statusFilter])

  const stateOptions = useMemo(() => (
    Array.from(new Set(drivers.flatMap(driver => driver.state ? [driver.state] : []))).sort()
  ), [drivers])

  const counts = useMemo(() => ({
    total: drivers.length,
    disponibles: drivers.filter(d => d.status === 'disponible').length,
    enViaje: drivers.filter(d => d.status === 'en_viaje').length,
    pendientes: drivers.filter(d => d.status === 'pendiente_validacion').length,
  }), [drivers])

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Conductores</h1>
          <p className="page-sub">
            {loading ? 'Cargando conductores…' : `${counts.total} conductores registrados`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Invitar conductor — próximamente')}>
          + Agregar conductor
        </button>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        {[
          { label: 'Total', value: counts.total, icon: '👥', color: 'var(--primary-dim)' },
          { label: 'Disponibles', value: counts.disponibles, icon: '✅', color: 'rgba(34,197,94,.12)' },
          { label: 'En viaje', value: counts.enViaje, icon: '🚗', color: 'rgba(56,189,248,.12)' },
          { label: 'Pendientes', value: counts.pendientes, icon: '⏳', color: 'rgba(245,158,11,.12)' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="icon" style={{ background: m.color }}>{m.icon}</div>
            <p className="value">{m.value}</p>
            <p className="label">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-search">
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Buscar por nombre, teléfono o estado…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Cualquier estatus</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="filter-select" value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
          <option value="">Cualquier estado</option>
          {stateOptions.map(state => <option key={state} value={state}>{state}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Conductor</th><th>Contacto</th><th>Estado</th>
              <th>Calificación</th><th>Viajes</th><th>Ganancias</th>
              <th>Certificado</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <p className="muted">Cargando conductores…</p>
                </div>
              </td></tr>
            ) : error ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <span className="icon">⚠️</span>
                  <p style={{ fontWeight: 600 }}>No se pudieron cargar conductores</p>
                  <p className="muted">{error}</p>
                </div>
              </td></tr>
            ) : filteredDrivers.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <span className="icon">🧑</span>
                  <p style={{ fontWeight: 600 }}>Sin conductores</p>
                  <p className="muted">No hay registros que coincidan con los filtros.</p>
                </div>
              </td></tr>
            ) : filteredDrivers.map(d => (
              <tr key={d.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
                      🧑
                    </div>
                    <p className="td-bold">{d.name ?? 'Sin nombre'}</p>
                  </div>
                </td>
                <td>
                  <p style={{ fontSize: 13 }}>{d.phone ?? 'Sin teléfono'}</p>
                  <span className="td-muted">{d.email ?? '—'}</span>
                </td>
                <td className="td-muted">{d.state ?? '—'}</td>
                <td>
                  {Number(d.rating) > 0
                    ? <span style={{ fontWeight: 600 }}>⭐ {d.rating}</span>
                    : <span className="td-muted">—</span>}
                </td>
                <td className="td-bold">{d.trips_completed ?? 0}</td>
                <td className="td-bold">
                  {Number(d.earnings) > 0
                    ? `$${Number(d.earnings).toLocaleString('es-MX')}`
                    : <span className="td-muted">—</span>}
                </td>
                <td>
                  {d.certified
                    ? <Chip variant="success">✓ Cert.</Chip>
                    : <Chip variant="warning">Pendiente</Chip>}
                </td>
                <td><Chip status={d.status ?? undefined}>{STATUS_LABELS[d.status ?? ''] ?? 'Sin estatus'}</Chip></td>
                <td>
                  <div className="td-actions">
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => showToast(`Perfil de ${d.name ?? 'conductor'}`)}>Ver</button>
                    {d.status === 'pendiente_validacion' && (
                      <button className="btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => showToast(`Validando a ${d.name ?? 'conductor'}…`)}>Validar</button>
                    )}
                    <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => router.push(`/conductores/${d.id}`)}>Ir al perfil</button>
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

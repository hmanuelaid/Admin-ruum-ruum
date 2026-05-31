'use client'
import { useEffect, useMemo, useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import type { IncidentStatus, IncidentType } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  dano_reportado: 'Daño reportado', retraso: 'Retraso',
  falta_evidencia: 'Falta evidencia', contacto_no_disponible: 'Contacto no disponible',
  problema_documentacion: 'Problema doc.', problema_pago: 'Problema pago',
  cancelacion: 'Cancelación', diferencia_kilometraje: 'Dif. kilometraje',
  diferencia_combustible: 'Dif. combustible', problema_conductor: 'Problema conductor',
  problema_usuario: 'Problema usuario', otro: 'Otro',
}

const STATUS_LABELS: Record<string, string> = {
  nueva: 'Nueva', en_revision: 'En revisión', requiere_informacion: 'Req. información',
  en_seguimiento: 'En seguimiento', resuelta: 'Resuelta',
  cerrada: 'Cerrada', escalada: 'Escalada',
}

interface IncidentTrip {
  id: string | null
  app_users: Relation<{
    name: string | null
    email: string | null
  }>
  drivers: Relation<{
    name: string | null
    email: string | null
  }>
}

type Relation<T> = T | T[] | null

interface IncidentRow {
  id: string
  trip_id: string | null
  type: IncidentType | string | null
  status: IncidentStatus | string | null
  description: string | null
  assigned_to: string | null
  resolution: string | null
  created_at: string | null
  updated_at: string | null
  trips: Relation<IncidentTrip>
}

function one<T>(value: Relation<T> | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export default function IncidenciasPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [incidents, setIncidents] = useState<IncidentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const { showToast } = useAppStore()

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function loadIncidents(showLoading = true) {
      if (showLoading) setLoading(true)
      setError('')

      const { data, error: loadError } = await supabase
        .from('incidents')
        .select('id,trip_id,type,status,description,assigned_to,resolution,created_at,updated_at,trips(id,app_users(name,email),drivers(name,email))')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (loadError) {
        setError(loadError.message)
        setIncidents([])
        showToast(`No se pudieron cargar incidencias: ${loadError.message}`)
      } else {
        setIncidents((data ?? []) as unknown as IncidentRow[])
      }

      if (showLoading) setLoading(false)
    }

    void loadIncidents()

    const channel = supabase
      .channel('admin-incidents')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'incidents',
      }, () => {
        void loadIncidents(false)
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [showToast])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return incidents.filter(incident => {
      const matchSearch =
        !query ||
        incident.id.toLowerCase().includes(query) ||
        (incident.trip_id ?? '').toLowerCase().includes(query) ||
        (incident.description ?? '').toLowerCase().includes(query) ||
        (one(one(incident.trips)?.app_users)?.name ?? '').toLowerCase().includes(query) ||
        (one(one(incident.trips)?.drivers)?.name ?? '').toLowerCase().includes(query)

      const matchType = !typeFilter || incident.type === typeFilter
      const matchStatus = !statusFilter || incident.status === statusFilter

      return matchSearch && matchType && matchStatus
    })
  }, [incidents, search, statusFilter, typeFilter])

  const counts = useMemo(() => ({
    nuevas: incidents.filter(incident => incident.status === 'nueva').length,
    revision: incidents.filter(incident => incident.status === 'en_revision').length,
    seguimiento: incidents.filter(incident => incident.status === 'en_seguimiento').length,
    resueltas: incidents.filter(incident => incident.status === 'resuelta').length,
  }), [incidents])

  async function attendIncident(incidentId: string) {
    setProcessing(incidentId)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('incidents')
      .update({ status: 'en_seguimiento', updated_at: new Date().toISOString() })
      .eq('id', incidentId)

    if (updateError) {
      showToast(`No se pudo atender la incidencia: ${updateError.message}`)
    } else {
      setIncidents(prev => prev.map(incident =>
        incident.id === incidentId ? { ...incident, status: 'en_seguimiento', updated_at: new Date().toISOString() } : incident
      ))
      showToast('Incidencia en seguimiento')
    }

    setProcessing(null)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Incidencias</h1>
          <p className="page-sub">
            {loading ? 'Cargando incidencias…' : `${incidents.length} incidencias registradas`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Nueva incidencia — próximamente')}>
          + Registrar incidencia
        </button>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        {[
          { label: 'Nuevas', value: counts.nuevas, icon: '🚨', color: 'rgba(239,68,68,.12)' },
          { label: 'En revisión', value: counts.revision, icon: '🔍', color: 'var(--primary-dim)' },
          { label: 'En seguimiento', value: counts.seguimiento, icon: '👁️', color: 'rgba(245,158,11,.12)' },
          { label: 'Resueltas', value: counts.resueltas, icon: '✅', color: 'rgba(34,197,94,.12)' },
        ].map(metric => (
          <div key={metric.label} className="metric-card">
            <div className="icon" style={{ background: metric.color }}>{metric.icon}</div>
            <p className="value">{metric.value}</p>
            <p className="label">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-search">
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Buscar por ID, viaje o descripción…"
            value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <select className="filter-select" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
          <option value="">Cualquier tipo</option>
          {Object.entries(TYPE_LABELS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
        </select>
        <select className="filter-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
          <option value="">Cualquier estatus</option>
          {Object.entries(STATUS_LABELS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Viaje</th><th>Tipo</th><th>Descripción</th>
              <th>Conductor</th><th>Usuario</th><th>Fecha</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <p className="muted">Cargando incidencias…</p>
                </div>
              </td></tr>
            ) : error ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <span className="icon">⚠️</span>
                  <p style={{ fontWeight: 600 }}>No se pudieron cargar incidencias</p>
                  <p className="muted">{error}</p>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <span className="icon">🎉</span>
                  <p style={{ fontWeight: 600 }}>Sin incidencias activas</p>
                  <p className="muted">No hay registros que coincidan con los filtros.</p>
                </div>
              </td></tr>
            ) : filtered.map(incident => {
              const trip = one(incident.trips)
              const driver = one(trip?.drivers)
              const user = one(trip?.app_users)

              return (
                <tr key={incident.id}>
                  <td className="mono td-bold">{incident.id}</td>
                  <td className="mono" style={{ color: 'var(--primary)', fontSize: 13 }}>{incident.trip_id ?? '—'}</td>
                  <td><Chip variant="warning">{TYPE_LABELS[incident.type ?? ''] ?? 'Sin tipo'}</Chip></td>
                  <td style={{ maxWidth: 220, fontSize: 13 }}>{incident.description ?? 'Sin descripción'}</td>
                  <td>{driver?.name ?? <span className="td-muted">—</span>}</td>
                  <td>{user?.name ?? <span className="td-muted">—</span>}</td>
                  <td className="td-muted">
                    {incident.created_at ? new Date(incident.created_at).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td><Chip status={incident.status ?? undefined}>{STATUS_LABELS[incident.status ?? ''] ?? 'Sin estatus'}</Chip></td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => showToast(`Abriendo incidencia ${incident.id}`)}>Ver</button>
                      <button className="btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}
                        disabled={processing === incident.id}
                        onClick={() => attendIncident(incident.id)}>
                        {processing === incident.id ? 'Atendiendo…' : 'Atender'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

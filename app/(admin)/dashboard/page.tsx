'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Chip } from '@/components/ui/Chip'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Metrics {
  viajesActivos: number
  sinConductor: number
  finalizadosHoy: number
  conductoresDisponibles: number
  incidenciasAbiertas: number
  docsPendientes: number
  pagosPendientes: number
  ingresosHoy: number
}

interface ActiveTrip {
  id: string
  status: string | null
  origin_address: string | null
  destination_address: string | null
  vehicle_plates: string | null
  driver_name: string | null
  user_name: string | null
  updated_at: string | null
}

interface Alert {
  id: string
  label: string
  level: 'danger' | 'warning'
  href: string
}

interface RecentActivity {
  id: string
  label: string
  time: string
  icon: string
}

const STATUS_LABELS: Record<string, string> = {
  conductor_asignado: 'Conductor asignado', conductor_en_camino: 'En camino',
  recoleccion_proceso: 'Recolección', evidencia_inicial_pendiente: 'Ev. inicial',
  traslado_curso: 'En tránsito', entrega_proceso: 'Entrega',
  evidencia_final_pendiente: 'Ev. final', pendiente_asignacion: 'Sin conductor',
  solicitud_recibida: 'Solicitud', finalizado: 'Finalizado',
}

function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

type DashboardActivityRow = {
  id: string
  status: string | null
  user_name: string | null
  updated_at: string | null
}

type DashboardPayload = {
  metrics?: Metrics
  active?: ActiveTrip[]
  upcoming?: ActiveTrip[]
  activity?: DashboardActivityRow[]
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [metrics,  setMetrics]  = useState<Metrics | null>(null)
  const [active,   setActive]   = useState<ActiveTrip[]>([])
  const [upcoming, setUpcoming] = useState<ActiveTrip[]>([])
  const [alerts,   setAlerts]   = useState<Alert[]>([])
  const [activity, setActivity] = useState<RecentActivity[]>([])
  const [loading,  setLoading]  = useState(true)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({})) as DashboardPayload & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? 'No se pudo cargar el dashboard')
      }

      const nextMetrics = payload.metrics ?? {
        viajesActivos: 0,
        sinConductor: 0,
        finalizadosHoy: 0,
        conductoresDisponibles: 0,
        incidenciasAbiertas: 0,
        docsPendientes: 0,
        pagosPendientes: 0,
        ingresosHoy: 0,
      }

      setMetrics(nextMetrics)
      setActive(payload.active ?? [])
      setUpcoming(payload.upcoming ?? [])

      const newAlerts: Alert[] = []
      if (nextMetrics.sinConductor > 0)
        newAlerts.push({ id: 'sin-conductor', label: `${nextMetrics.sinConductor} viajes sin conductor asignado`, level: 'danger', href: '/viajes' })
      if (nextMetrics.incidenciasAbiertas > 0)
        newAlerts.push({ id: 'incidencias', label: `${nextMetrics.incidenciasAbiertas} incidencias abiertas`, level: 'danger', href: '/incidencias' })
      if (nextMetrics.docsPendientes > 0)
        newAlerts.push({ id: 'docs', label: `${nextMetrics.docsPendientes} documentos en revisión`, level: 'warning', href: '/documentos' })
      if (nextMetrics.pagosPendientes > 0)
        newAlerts.push({ id: 'pagos', label: `${nextMetrics.pagosPendientes} pagos pendientes de aprobación`, level: 'warning', href: '/pagos' })
      setAlerts(newAlerts)

      setActivity((payload.activity ?? []).map(t => ({
        id: t.id,
        label: `Viaje de ${t.user_name ?? 'Usuario'} → ${STATUS_LABELS[t.status ?? ''] ?? t.status}`,
        time: timeAgo(t.updated_at ?? null),
        icon: t.status === 'finalizado' ? '✅' : t.status === 'cancelado' ? '❌' : '🚗',
      })))
    } catch {
      if (showLoading) {
        setMetrics(null)
        setActive([])
        setUpcoming([])
        setAlerts([])
        setActivity([])
      }
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  // Carga inicial + realtime
  useEffect(() => {
    queueMicrotask(() => void loadDashboard())
    const supabase = createClient()
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => {
        void loadDashboard(false)
      }, 1200)
    }

    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, scheduleRefresh)
      .subscribe()

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [loadDashboard])

  const m = metrics

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">
            {loading ? 'Cargando…' : 'Vista general de la operación · actualización en tiempo real'}
          </p>
        </div>
        <Link href="/viajes">
          <button className="btn-primary">+ Nuevo viaje</button>
        </Link>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        {[
          { icon: '🚗', label: 'Viajes activos',          value: loading ? '—' : m?.viajesActivos ?? 0,         color: 'var(--accent)',   href: '/viajes'      },
          { icon: '⏳', label: 'Sin conductor',            value: loading ? '—' : m?.sinConductor ?? 0,          color: 'var(--warning)',  href: '/viajes'      },
          { icon: '✅', label: 'Finalizados hoy',          value: loading ? '—' : m?.finalizadosHoy ?? 0,        color: 'var(--success)',  href: '/viajes'      },
          { icon: '👤', label: 'Conductores disponibles',  value: loading ? '—' : m?.conductoresDisponibles ?? 0, color: 'var(--primary)', href: '/conductores' },
          { icon: '🚨', label: 'Incidencias abiertas',     value: loading ? '—' : m?.incidenciasAbiertas ?? 0,   color: 'var(--danger)',   href: '/incidencias' },
          { icon: '📄', label: 'Docs en revisión',         value: loading ? '—' : m?.docsPendientes ?? 0,        color: 'var(--warning)',  href: '/documentos'  },
          { icon: '💳', label: 'Pagos pendientes',         value: loading ? '—' : m?.pagosPendientes ?? 0,       color: 'var(--success)',  href: '/pagos'       },
          { icon: '💰', label: 'Ingresos hoy',             value: loading ? '—' : `$${(m?.ingresosHoy ?? 0).toLocaleString('es-MX')}`, color: 'var(--primary)', href: '/reportes' },
        ].map(metric => (
          <div key={metric.label} className="metric-card" style={{ cursor: 'pointer' }}
            onClick={() => router.push(metric.href)}>
            <div className="icon" style={{ background: `${metric.color}22` }}>{metric.icon}</div>
            <p className="value">{metric.value}</p>
            <p className="label">{metric.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* Viajes activos */}
        <div className="card">
          <div className="card-header">
            <p className="card-title">Viajes activos</p>
            <Link href="/viajes"><button className="btn-ghost">Ver todos →</button></Link>
          </div>
          {loading ? (
            <div className="empty-state"><p className="muted">Cargando…</p></div>
          ) : active.length === 0 ? (
            <div className="empty-state">
              <span className="icon">🚗</span>
              <p style={{ fontWeight: 600 }}>Sin viajes activos</p>
              <p className="muted">Los traslados en curso aparecerán aquí</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {active.map(trip => (
                <div key={trip.id}
                  onClick={() => router.push(`/viajes/${trip.id}`)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                      {trip.user_name ?? 'Usuario'} · {trip.vehicle_plates ?? 'Sin placas'}
                    </p>
                    <p className="td-muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {trip.origin_address?.split(',')[0] ?? '—'} → {trip.destination_address?.split(',')[0] ?? '—'}
                    </p>
                    {trip.driver_name && (
                      <p className="td-muted" style={{ fontSize: 11 }}>🧑 {trip.driver_name}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 12 }}>
                    <Chip status={trip.status ?? undefined}>{STATUS_LABELS[trip.status ?? ''] ?? trip.status}</Chip>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(trip.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Alertas */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">⚠️ Alertas operativas</p>
              <span className={`chip chip-${alerts.length > 0 ? 'danger' : 'success'}`}>{alerts.length}</span>
            </div>
            {alerts.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 16px' }}>
                <span className="icon">✅</span>
                <p className="muted">Sin alertas por atender</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {alerts.map(alert => (
                  <div key={alert.id}
                    onClick={() => router.push(alert.href)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{alert.level === 'danger' ? '🔴' : '🟡'}</span>
                    <p style={{ fontSize: 13 }}>{alert.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actividad reciente */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">Actividad reciente</p>
            </div>
            {loading ? (
              <div className="empty-state" style={{ padding: '20px 16px' }}><p className="muted">Cargando…</p></div>
            ) : activity.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 16px' }}>
                <span className="icon">📋</span><p className="muted">Sin actividad reciente</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activity.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '0.5px solid var(--border)' }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Próximos viajes programados */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <p className="card-title">📅 Próximos traslados programados</p>
          <Link href="/viajes"><button className="btn-ghost">Ver todos →</button></Link>
        </div>
        {loading ? (
          <div className="empty-state"><p className="muted">Cargando…</p></div>
        ) : upcoming.length === 0 ? (
          <div className="empty-state">
            <span className="icon">📅</span>
            <p style={{ fontWeight: 600 }}>Sin traslados programados</p>
            <p className="muted">Los viajes agendados aparecerán aquí</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {upcoming.map(trip => (
              <div key={trip.id}
                onClick={() => router.push(`/viajes/${trip.id}`)}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{trip.user_name ?? 'Usuario'}</p>
                  <p className="td-muted" style={{ fontSize: 12 }}>
                    {trip.origin_address?.split(',')[0] ?? '—'} → {trip.destination_address?.split(',')[0] ?? '—'}
                  </p>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(trip.updated_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

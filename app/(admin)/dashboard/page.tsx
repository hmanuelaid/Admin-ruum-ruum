'use client'
import { useEffect, useState, useCallback } from 'react'
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

const ACTIVE_STATUSES = [
  'conductor_asignado', 'conductor_en_camino', 'recoleccion_proceso',
  'evidencia_inicial_pendiente', 'traslado_curso', 'entrega_proceso',
  'evidencia_final_pendiente',
]

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

// ── Componente ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [metrics,  setMetrics]  = useState<Metrics | null>(null)
  const [active,   setActive]   = useState<ActiveTrip[]>([])
  const [upcoming, setUpcoming] = useState<ActiveTrip[]>([])
  const [alerts,   setAlerts]   = useState<Alert[]>([])
  const [activity, setActivity] = useState<RecentActivity[]>([])
  const [loading,  setLoading]  = useState(true)

  const loadDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const supabase = createClient()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      activeTripsRes,
      sinConductorRes,
      finalizadosRes,
      conductoresRes,
      incidenciasRes,
      docsRes,
      pagosRes,
      ingresosRes,
      upcomingRes,
      recentTripsRes,
    ] = await Promise.all([
      // Viajes activos
      supabase.from('trips').select('id, status, origin_address, destination_address, vehicle_plates, updated_at, drivers(name), app_users(name)')
        .in('status', ACTIVE_STATUSES).order('updated_at', { ascending: false }),
      // Sin conductor
      supabase.from('trips').select('id', { count: 'exact', head: true })
        .in('status', ['solicitud_recibida', 'pendiente_revision', 'pendiente_asignacion']),
      // Finalizados hoy
      supabase.from('trips').select('id', { count: 'exact', head: true })
        .eq('status', 'finalizado').gte('updated_at', todayStart.toISOString()),
      // Conductores disponibles
      supabase.from('drivers').select('id', { count: 'exact', head: true })
        .in('status', ['disponible', 'activo']),
      // Incidencias abiertas
      supabase.from('incidents').select('id', { count: 'exact', head: true })
        .in('status', ['nueva', 'en_revision', 'en_seguimiento', 'escalada']),
      // Docs pendientes
      supabase.from('documents').select('id', { count: 'exact', head: true })
        .eq('status', 'en_revision'),
      // Pagos pendientes
      supabase.from('payments').select('id', { count: 'exact', head: true })
        .in('status', ['pendiente', 'en_revision']),
      // Ingresos hoy
      supabase.from('payments').select('amount')
        .eq('type', 'cobro_usuario').eq('status', 'pagado')
        .gte('created_at', todayStart.toISOString()),
      // Próximos programados
      supabase.from('trips').select('id, status, origin_address, destination_address, vehicle_plates, scheduled_at, app_users(name)')
        .eq('status', 'solicitud_recibida').not('scheduled_at', 'is', null)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true }).limit(5),
      // Actividad reciente
      supabase.from('trips').select('id, status, updated_at, app_users(name)')
        .order('updated_at', { ascending: false }).limit(8),
    ])

    // Métricas
    const ingresosHoy = (ingresosRes.data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)
    setMetrics({
      viajesActivos:        activeTripsRes.data?.length ?? 0,
      sinConductor:         sinConductorRes.count ?? 0,
      finalizadosHoy:       finalizadosRes.count ?? 0,
      conductoresDisponibles: conductoresRes.count ?? 0,
      incidenciasAbiertas:  incidenciasRes.count ?? 0,
      docsPendientes:       docsRes.count ?? 0,
      pagosPendientes:      pagosRes.count ?? 0,
      ingresosHoy,
    })

    // Viajes activos
    type RawTrip = { id: string; status: string | null; origin_address: string | null; destination_address: string | null; vehicle_plates: string | null; updated_at?: string | null; drivers?: { name: string | null } | { name: string | null }[] | null; app_users?: { name: string | null } | { name: string | null }[] | null }
    const toActive = (t: RawTrip): ActiveTrip => ({
      id: t.id, status: t.status,
      origin_address: t.origin_address,
      destination_address: t.destination_address,
      vehicle_plates: t.vehicle_plates,
      updated_at: t.updated_at ?? null,
      driver_name: (Array.isArray(t.drivers) ? t.drivers[0] : t.drivers)?.name ?? null,
      user_name: (Array.isArray(t.app_users) ? t.app_users[0] : t.app_users)?.name ?? null,
    })
    setActive((activeTripsRes.data ?? []).map(t => toActive(t as RawTrip)))
    setUpcoming((upcomingRes.data ?? []).map(t => toActive(t as RawTrip)))

    // Alertas dinámicas
    const newAlerts: Alert[] = []
    if ((sinConductorRes.count ?? 0) > 0)
      newAlerts.push({ id: 'sin-conductor', label: `${sinConductorRes.count} viajes sin conductor asignado`, level: 'danger', href: '/viajes' })
    if ((incidenciasRes.count ?? 0) > 0)
      newAlerts.push({ id: 'incidencias', label: `${incidenciasRes.count} incidencias abiertas`, level: 'danger', href: '/incidencias' })
    if ((docsRes.count ?? 0) > 0)
      newAlerts.push({ id: 'docs', label: `${docsRes.count} documentos en revisión`, level: 'warning', href: '/documentos' })
    if ((pagosRes.count ?? 0) > 0)
      newAlerts.push({ id: 'pagos', label: `${pagosRes.count} pagos pendientes de aprobación`, level: 'warning', href: '/pagos' })
    setAlerts(newAlerts)

    // Actividad reciente
    setActivity((recentTripsRes.data ?? []).map(t => {
      const userName = (Array.isArray(t.app_users) ? t.app_users[0] : t.app_users)?.name ?? 'Usuario'
      return {
        id: t.id,
        label: `Viaje de ${userName} → ${STATUS_LABELS[t.status ?? ''] ?? t.status}`,
        time: timeAgo(t.updated_at ?? null),
        icon: t.status === 'finalizado' ? '✅' : t.status === 'cancelado' ? '❌' : '🚗',
      }
    }))

    if (showLoading) setLoading(false)
  }, [])

  // Carga inicial + realtime
  useEffect(() => {
    queueMicrotask(() => void loadDashboard())
    const supabase = createClient()

    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' },    () => void loadDashboard(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' },  () => void loadDashboard(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' },() => void loadDashboard(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => void loadDashboard(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' },() => void loadDashboard(false))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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

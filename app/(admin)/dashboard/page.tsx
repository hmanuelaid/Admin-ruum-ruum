'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { createClient } from '@/lib/supabase'

interface DashMetrics {
  activeTrips: number
  pendingAssignment: number
  finishedToday: number
  availableDrivers: number
  openIncidents: number
  pendingDocs: number
  pendingPayments: number
  weeklyIncome: number
}

interface RecentTrip {
  id: string
  status: string
  vehicle_brand: string | null
  vehicle_model: string | null
  vehicle_plates: string | null
  origin_address: string | null
  destination_address: string | null
  client_price_mxn: number | null
  driver_id: string | null
}

const STATUS_LABELS: Record<string, string> = {
  solicitud_recibida: 'Solicitud recibida', pendiente_revision: 'En revisión',
  pendiente_asignacion: 'Sin conductor', conductor_asignado: 'Conductor asignado',
  conductor_en_camino: 'En camino', recoleccion_proceso: 'Recolección',
  traslado_curso: 'En curso', entrega_proceso: 'Entrega',
  finalizado: 'Finalizado', cancelado: 'Cancelado', incidente: 'Incidente',
}

const ACTIVE_STATUSES = [
  'solicitud_recibida','pendiente_revision','pendiente_asignacion',
  'conductor_asignado','conductor_en_camino','recoleccion_proceso',
  'evidencia_inicial_pendiente','traslado_curso','entrega_proceso','evidencia_final_pendiente',
]

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashMetrics>({
    activeTrips: 0, pendingAssignment: 0, finishedToday: 0,
    availableDrivers: 0, openIncidents: 0, pendingDocs: 0,
    pendingPayments: 0, weeklyIncome: 0,
  })
  const [activeTrips, setActiveTrips] = useState<RecentTrip[]>([])
  const [alerts, setAlerts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const supabase = createClient()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)

    const [
      { data: allTrips },
      { data: drivers },
      { data: incidents },
      { data: docs },
      { data: payments },
    ] = await Promise.all([
      supabase.from('trips').select('id,status,driver_id,vehicle_brand,vehicle_model,vehicle_plates,origin_address,destination_address,client_price_mxn,created_at').order('created_at', { ascending: false }),
      supabase.from('drivers').select('id,status'),
      supabase.from('incidents').select('id,status'),
      supabase.from('documents').select('id,status'),
      supabase.from('payments').select('id,status,amount,type,created_at'),
    ])

    const trips = allTrips ?? []
    const active = trips.filter(t => ACTIVE_STATUSES.includes(t.status))
    const finishedToday = trips.filter(t =>
      t.status === 'finalizado' &&
      new Date(t.created_at) >= todayStart
    )
    const weeklyIncome = (payments ?? [])
      .filter(p => p.type === 'cobro_usuario' && p.status === 'pagado' && new Date(p.created_at) >= weekStart)
      .reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)

    // Construir alertas
    const newAlerts: string[] = []
    trips.filter(t => t.status === 'pendiente_asignacion').forEach(t => {
      newAlerts.push(`⏳ ${t.id} — Sin conductor asignado`)
    })
    trips.filter(t => t.status === 'incidente').forEach(t => {
      newAlerts.push(`🚨 ${t.id} — Incidencia sin atender`)
    });
    (incidents ?? []).filter((i: { status: string }) => i.status === 'nueva').forEach(() => {
      newAlerts.push('🚨 Incidencia nueva sin responsable')
    });
    (docs ?? []).filter((d: { status: string }) => d.status === 'en_revision').forEach((d: { status: string }) => {
      newAlerts.push('📄 Documento pendiente de revisión')
    })

    setMetrics({
      activeTrips: active.length,
      pendingAssignment: trips.filter(t => t.status === 'pendiente_asignacion' || t.status === 'solicitud_recibida').length,
      finishedToday: finishedToday.length,
      availableDrivers: (drivers ?? []).filter((d: { status: string }) => d.status === 'disponible').length,
      openIncidents: (incidents ?? []).filter((i: { status: string }) => ['nueva','en_revision','en_seguimiento'].includes(i.status)).length,
      pendingDocs: (docs ?? []).filter((d: { status: string }) => d.status === 'en_revision').length,
      pendingPayments: (payments ?? []).filter((p: { status: string }) => p.status === 'pendiente').length,
      weeklyIncome,
    })
    setActiveTrips(active.slice(0, 5) as RecentTrip[])
    setAlerts([...new Set(newAlerts)].slice(0, 6))
    setLoading(false)
  }

  const METRIC_CARDS = [
    { icon: '🚗', label: 'Viajes activos',          value: metrics.activeTrips,       color: 'rgba(56,189,248,.12)',  up: true },
    { icon: '⏳', label: 'Pendientes de asignación', value: metrics.pendingAssignment,  color: 'rgba(245,158,11,.12)',  up: false },
    { icon: '✅', label: 'Finalizados hoy',           value: metrics.finishedToday,     color: 'rgba(34,197,94,.12)',   up: true },
    { icon: '👤', label: 'Conductores disponibles',   value: metrics.availableDrivers,  color: 'var(--primary-dim)',    up: true },
    { icon: '🚨', label: 'Incidencias abiertas',      value: metrics.openIncidents,     color: 'rgba(239,68,68,.12)',   up: false },
    { icon: '📄', label: 'Docs en revisión',          value: metrics.pendingDocs,       color: 'rgba(245,158,11,.12)',  up: false },
    { icon: '💳', label: 'Pagos pendientes',          value: metrics.pendingPayments,   color: 'rgba(34,197,94,.12)',   up: false },
    { icon: '💰', label: 'Ingresos esta semana',      value: metrics.weeklyIncome > 0 ? `$${metrics.weeklyIncome.toLocaleString('es-MX')}` : '$0', color: 'var(--primary-dim)', up: true },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Vista general de la operación · {new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={loadDashboard}>↺ Actualizar</button>
          <Link href="/viajes"><button className="btn-primary">+ Nuevo viaje</button></Link>
        </div>
      </div>

      {/* Métricas */}
      {loading ? (
        <div className="card"><div className="empty-state"><p className="muted">Cargando datos…</p></div></div>
      ) : (
        <>
          <div className="metrics-grid">
            {METRIC_CARDS.map(m => (
              <div key={m.label} className="metric-card">
                <div className="icon" style={{ background: m.color }}>{m.icon}</div>
                <p className="value">{m.value}</p>
                <p className="label">{m.label}</p>
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
              {activeTrips.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <span className="icon">✅</span>
                  <p className="muted">Sin viajes activos por el momento</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th><th>Vehículo</th><th>Ruta</th>
                        <th>Conductor</th><th>Estatus</th><th>Tarifa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTrips.map(t => (
                        <tr key={t.id}>
                          <td className="mono td-bold">{t.id}</td>
                          <td>
                            {t.vehicle_brand} {t.vehicle_model}
                            <br/><span className="td-muted">{t.vehicle_plates}</span>
                          </td>
                          <td style={{ maxWidth: 200 }}>
                            <span style={{ fontSize: 12 }}>{t.origin_address?.split(',')[0]}</span>
                            <br/><span className="td-muted">→ {t.destination_address?.split(',')[0]}</span>
                          </td>
                          <td>
                            {t.driver_id
                              ? <Chip variant="success">Asignado</Chip>
                              : <Chip variant="warning">Sin asignar</Chip>}
                          </td>
                          <td><Chip status={t.status}>{STATUS_LABELS[t.status] ?? t.status}</Chip></td>
                          <td className="td-bold">${Number(t.client_price_mxn).toLocaleString('es-MX')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Columna derecha */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Alertas */}
              <div className="card">
                <div className="card-header">
                  <p className="card-title">⚠️ Alertas operativas</p>
                  {alerts.length > 0 && <span className="chip chip-danger">{alerts.length}</span>}
                </div>
                {alerts.length === 0 ? (
                  <div className="alert alert-success">
                    <span>✅</span>
                    <span style={{ fontSize: 13 }}>Todo en orden por el momento</span>
                  </div>
                ) : (
                  <div className="stack">
                    {alerts.map((a, i) => (
                      <div key={i} className={`alert ${a.startsWith('🚨') ? 'alert-danger' : 'alert-warning'}`}>
                        <span style={{ fontSize: 12 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumen rápido */}
              <div className="card">
                <div className="card-header">
                  <p className="card-title">Resumen del día</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { label: 'Viajes activos',     value: metrics.activeTrips },
                    { label: 'Sin conductor',       value: metrics.pendingAssignment },
                    { label: 'Finalizados hoy',     value: metrics.finishedToday },
                    { label: 'Conductores libres',  value: metrics.availableDrivers },
                    { label: 'Incidencias abiertas',value: metrics.openIncidents },
                    { label: 'Pagos pendientes',    value: metrics.pendingPayments },
                  ].map(item => (
                    <div key={item.label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid var(--border)',
                      fontSize: 13,
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                      <span style={{ fontWeight: 700 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </>
  )
}
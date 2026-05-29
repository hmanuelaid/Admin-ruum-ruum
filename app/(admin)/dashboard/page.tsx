'use client'
import Link from 'next/link'
import { Chip } from '@/components/ui/Chip'
import { mockTrips, mockDrivers, mockDocuments, mockPayments } from '@/lib/mock-data'

const METRICS = [
  { icon: '🚗', label: 'Viajes activos',       value: 3, delta: '+1 hoy',   color: 'var(--accent)',   up: true },
  { icon: '⏳', label: 'Sin conductor',         value: 1, delta: 'Urgente',  color: 'var(--warning)',  up: false },
  { icon: '✅', label: 'Finalizados hoy',       value: 2, delta: '+2 hoy',   color: 'var(--success)',  up: true },
  { icon: '👤', label: 'Conductores disponibles', value: 2, delta: 'En línea', color: 'var(--primary)', up: true },
  { icon: '🚨', label: 'Incidencias abiertas',  value: 1, delta: 'Revisar',  color: 'var(--danger)',   up: false },
  { icon: '📄', label: 'Docs pendientes',       value: 4, delta: 'En cola',  color: 'var(--warning)',  up: false },
  { icon: '💳', label: 'Pagos pendientes',      value: 3, delta: '$43,260',  color: 'var(--success)',  up: true },
  { icon: '💰', label: 'Ingresos estimados',    value: '$65,340', delta: 'Esta semana', color: 'var(--primary)', up: true },
]

const ALERTS = [
  { type: 'danger',  icon: '🚨', msg: 'RR-2024-004 — Incidencia sin atender: daño reportado' },
  { type: 'warning', icon: '⏳', msg: 'RR-2024-002 — Sin conductor asignado desde hace 2 h' },
  { type: 'warning', icon: '📄', msg: 'Ana Patricia Ruiz — Documentos pendientes de revisión' },
  { type: 'warning', icon: '📄', msg: 'Luis Torres — Comprobante de domicilio vencido' },
  { type: 'warning', icon: '💳', msg: 'RR-2024-001 — Pago al cliente pendiente: $32,200' },
]

const ACTIVITY = [
  { time: '10:32', icon: '🚗', msg: 'Viaje RR-2024-001 en curso · Roberto Sánchez' },
  { time: '09:15', icon: '📋', msg: 'Solicitud RR-2024-002 recibida · AutoMax' },
  { time: '08:50', icon: '📸', msg: 'Evidencia inicial cargada · RR-2024-004' },
  { time: '08:00', icon: '✅', msg: 'RR-2024-003 finalizado · Guadalajara → Monterrey' },
  { time: 'Ayer',  icon: '👤', msg: 'Ana Patricia Ruiz se registró como conductora' },
]

const STATUS_LABELS: Record<string, string> = {
  traslado_curso: 'En curso', pendiente_asignacion: 'Sin conductor',
  finalizado: 'Finalizado', incidente: 'Incidente',
}

export default function DashboardPage() {
  const activeTrips = mockTrips.filter(t =>
    !['finalizado','cancelado'].includes(t.status))

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Vista general de la operación · Hoy</p>
        </div>
        <Link href="/viajes">
          <button className="btn-primary">+ Nuevo viaje</button>
        </Link>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        {METRICS.map(m => (
          <div key={m.label} className="metric-card">
            <div className="icon" style={{ background: `${m.color}22` }}>
              {m.icon}
            </div>
            <p className="value">{m.value}</p>
            <p className="label">{m.label}</p>
            <p className={`delta ${m.up ? 'delta-up' : 'delta-down'}`}>{m.delta}</p>
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
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Vehículo</th>
                  <th>Ruta</th>
                  <th>Conductor</th>
                  <th>Estatus</th>
                  <th>Tarifa</th>
                </tr>
              </thead>
              <tbody>
                {activeTrips.map(t => (
                  <tr key={t.id}>
                    <td className="td-bold mono">{t.id}</td>
                    <td>{t.vehicle.brand} {t.vehicle.model}<br/><span className="td-muted">{t.vehicle.plates}</span></td>
                    <td style={{ maxWidth: 200 }}>
                      <span style={{ fontSize: 12 }}>{t.origin.address.split(',')[0]}</span><br/>
                      <span className="td-muted">→ {t.destination.address.split(',')[0]}</span>
                    </td>
                    <td>{t.driver?.name ?? <span className="chip chip-warning">Sin asignar</span>}</td>
                    <td><Chip status={t.status}>{STATUS_LABELS[t.status] ?? t.status}</Chip></td>
                    <td className="td-bold">${t.clientPriceMXN.toLocaleString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna derecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Alertas */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">⚠️ Alertas operativas</p>
              <span className="chip chip-danger">{ALERTS.length}</span>
            </div>
            <div className="stack">
              {ALERTS.map((a, i) => (
                <div key={i} className={`alert alert-${a.type}`}>
                  <span>{a.icon}</span>
                  <span style={{ fontSize: 12 }}>{a.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actividad reciente */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">Actividad reciente</p>
            </div>
            <div className="stack">
              {ACTIVITY.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16 }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13 }}>{a.msg}</p>
                  </div>
                  <span className="td-muted" style={{ fontSize: 11, flexShrink: 0 }}>{a.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Próximos viajes */}
      <div className="card">
        <div className="card-header">
          <p className="card-title">📅 Próximos traslados programados</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Usuario</th><th>Vehículo</th>
                <th>Origen → Destino</th><th>Fecha programada</th><th>Tarifa</th>
              </tr>
            </thead>
            <tbody>
              {mockTrips.filter(t => t.scheduledAt).map(t => (
                <tr key={t.id}>
                  <td className="mono td-bold">{t.id}</td>
                  <td>{t.user.name}</td>
                  <td>{t.vehicle.brand} {t.vehicle.model}</td>
                  <td style={{ fontSize: 12 }}>
                    {t.origin.address.split(',')[0]} → {t.destination.address.split(',')[0]}
                  </td>
                  <td className="td-muted">
                    {t.scheduledAt ? new Date(t.scheduledAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="td-bold">${t.clientPriceMXN.toLocaleString('es-MX')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
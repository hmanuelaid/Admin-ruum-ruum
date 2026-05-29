'use client'
import { useState } from 'react'
import { mockTrips, mockDrivers, mockPayments } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'

type Tab = 'Operativos' | 'Financieros' | 'Conductores' | 'Usuarios'

const TRIP_BY_STATUS = [
  { label: 'En curso',    value: 2, color: 'var(--accent)' },
  { label: 'Finalizados', value: 1, color: 'var(--success)' },
  { label: 'Sin conductor', value: 1, color: 'var(--warning)' },
  { label: 'Incidencia',  value: 1, color: 'var(--danger)' },
]

const INCOME_WEEKLY = [
  { day: 'Lun', amount: 8400 },
  { day: 'Mar', amount: 12200 },
  { day: 'Mié', amount: 6800 },
  { day: 'Jue', amount: 15600 },
  { day: 'Vie', amount: 22340 },
  { day: 'Sáb', amount: 9800 },
  { day: 'Dom', amount: 4200 },
]

const maxIncome = Math.max(...INCOME_WEEKLY.map(d => d.amount))

export default function ReportesPage() {
  const [tab, setTab] = useState<Tab>('Operativos')
  const { showToast } = useAppStore()

  const totalIngresos = mockPayments.filter(p => p.type === 'cobro_usuario').reduce((s, p) => s + p.amount, 0)
  const totalConductores = mockPayments.filter(p => p.type === 'pago_conductor').reduce((s, p) => s + p.amount, 0)
  const margen = totalIngresos - totalConductores

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-sub">Desempeño operativo y financiero</p>
        </div>
        <button className="btn-secondary" onClick={() => showToast('Exportando reporte…')}>
          ↓ Exportar
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['Operativos','Financieros','Conductores','Usuarios'] as Tab[]).map(t => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Operativos' && (
        <>
          <div className="metrics-grid">
            {[
              { label: 'Viajes totales',   value: mockTrips.length,  icon: '🚗' },
              { label: 'Viajes activos',   value: 3,                  icon: '🔄' },
              { label: 'Finalizados',      value: 1,                  icon: '✅' },
              { label: 'Cancelados',       value: 0,                  icon: '❌' },
              { label: 'Incidencias',      value: 1,                  icon: '🚨' },
              { label: 'Km totales',       value: '5,520',            icon: '📍' },
              { label: 'Tiempo prom. asig.', value: '1.2h',           icon: '⏱️' },
              { label: 'Tiempo prom. viaje', value: '9.4h',           icon: '🕐' },
            ].map(m => (
              <div key={m.label} className="metric-card">
                <div className="icon" style={{ background: 'var(--primary-dim)' }}>{m.icon}</div>
                <p className="value" style={{ fontSize: 22 }}>{m.value}</p>
                <p className="label">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Distribución por estatus */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">Distribución de viajes por estatus</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TRIP_BY_STATUS.map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      background: item.color,
                      width: `${(item.value / mockTrips.length) * 100}%`,
                      transition: 'width .4s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'Financieros' && (
        <>
          <div className="metrics-grid">
            {[
              { label: 'Ingresos totales',   value: `$${totalIngresos.toLocaleString('es-MX')}`,    icon: '💰', color: 'rgba(34,197,94,.12)' },
              { label: 'Pagos conductores',  value: `$${totalConductores.toLocaleString('es-MX')}`, icon: '🧑', color: 'rgba(56,189,248,.12)' },
              { label: 'Margen estimado',    value: `$${margen.toLocaleString('es-MX')}`,           icon: '📈', color: 'var(--primary-dim)' },
              { label: 'Pagos pendientes',   value: '3',                                             icon: '⏳', color: 'rgba(245,158,11,.12)' },
            ].map(m => (
              <div key={m.label} className="metric-card">
                <div className="icon" style={{ background: m.color }}>{m.icon}</div>
                <p className="value" style={{ fontSize: 18 }}>{m.value}</p>
                <p className="label">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Gráfica de ingresos */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">Ingresos estimados esta semana</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '0 8px' }}>
              {INCOME_WEEKLY.map(d => (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    ${(d.amount / 1000).toFixed(1)}k
                  </span>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0',
                    background: d.day === 'Vie' ? 'var(--primary)' : 'var(--surface-2)',
                    border: `1px solid ${d.day === 'Vie' ? 'var(--primary)' : 'var(--border)'}`,
                    height: `${(d.amount / maxIncome) * 120}px`,
                    transition: 'height .4s',
                  }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'Conductores' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Conductor</th><th>Estado</th><th>Viajes</th>
                <th>Calificación</th><th>Ganancias</th><th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {mockDrivers.map(d => (
                <tr key={d.id}>
                  <td className="td-bold">{d.name}</td>
                  <td className="td-muted">{d.state}</td>
                  <td className="td-bold">{d.tripsCompleted}</td>
                  <td>{d.rating > 0 ? `⭐ ${d.rating}` : <span className="td-muted">—</span>}</td>
                  <td className="td-bold">
                    {d.earnings > 0 ? `$${d.earnings.toLocaleString('es-MX')}` : <span className="td-muted">—</span>}
                  </td>
                  <td>
                    <span className={`chip chip-${d.status === 'disponible' || d.status === 'en_viaje' ? 'success' : 'warning'}`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Usuarios' && (
        <div className="card">
          <div className="empty-state">
            <span className="icon">📊</span>
            <p style={{ fontWeight: 600 }}>Reportes de usuarios</p>
            <p className="muted">Disponible en la siguiente fase del proyecto</p>
            <button className="btn-secondary" style={{ marginTop: 8 }}
              onClick={() => showToast('Próximamente disponible')}>
              Notificarme cuando esté listo
            </button>
          </div>
        </div>
      )}
    </>
  )
}
'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { mockPayments, mockTrips } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'

type Tab = 'Todos' | 'Cobros' | 'Conductores' | 'Gastos'

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', en_revision: 'En revisión', aprobado: 'Aprobado',
  rechazado: 'Rechazado', pagado: 'Pagado', revocado: 'Revocado', ajustado: 'Ajustado',
}

const TYPE_LABELS: Record<string, string> = {
  cobro_usuario: 'Cobro al usuario',
  pago_conductor: 'Pago al conductor',
  gasto: 'Gasto',
}

export default function PagosPage() {
  const [tab, setTab] = useState<Tab>('Todos')
  const { showToast } = useAppStore()

  const payments = mockPayments.filter(p => {
    if (tab === 'Cobros')      return p.type === 'cobro_usuario'
    if (tab === 'Conductores') return p.type === 'pago_conductor'
    if (tab === 'Gastos')      return p.type === 'gasto'
    return true
  })

  const totalPendiente = mockPayments
    .filter(p => p.status === 'pendiente')
    .reduce((s, p) => s + p.amount, 0)
  const totalPagado = mockPayments
    .filter(p => p.status === 'pagado')
    .reduce((s, p) => s + p.amount, 0)
  const totalCobros = mockPayments
    .filter(p => p.type === 'cobro_usuario')
    .reduce((s, p) => s + p.amount, 0)
  const totalConductores = mockPayments
    .filter(p => p.type === 'pago_conductor')
    .reduce((s, p) => s + p.amount, 0)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pagos</h1>
          <p className="page-sub">Control de cobros, pagos y gastos</p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Registrar pago — próximamente')}>
          + Registrar pago
        </button>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        {[
          { label: 'Pendientes',        value: `$${totalPendiente.toLocaleString('es-MX')}`, icon: '⏳', color: 'rgba(245,158,11,.12)' },
          { label: 'Pagados',           value: `$${totalPagado.toLocaleString('es-MX')}`,    icon: '✅', color: 'rgba(34,197,94,.12)' },
          { label: 'Cobros usuarios',   value: `$${totalCobros.toLocaleString('es-MX')}`,    icon: '💳', color: 'var(--primary-dim)' },
          { label: 'Pago conductores',  value: `$${totalConductores.toLocaleString('es-MX')}`, icon: '🧑', color: 'rgba(56,189,248,.12)' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="icon" style={{ background: m.color }}>{m.icon}</div>
            <p className="value" style={{ fontSize: 20 }}>{m.value}</p>
            <p className="label">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['Todos','Cobros','Conductores','Gastos'] as Tab[]).map(t => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Tabla */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Viaje</th><th>Concepto</th><th>Tipo</th>
              <th>Monto</th><th>Fecha</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td className="mono td-bold">{p.id}</td>
                <td className="mono" style={{ color: 'var(--primary)', fontSize: 13 }}>{p.tripId}</td>
                <td style={{ fontSize: 13 }}>{p.concept}</td>
                <td><Chip variant="default">{TYPE_LABELS[p.type]}</Chip></td>
                <td className="td-bold">${p.amount.toLocaleString('es-MX')}</td>
                <td className="td-muted">{p.date ? new Date(p.date).toLocaleDateString('es-MX') : '—'}</td>
                <td><Chip status={p.status}>{STATUS_LABELS[p.status]}</Chip></td>
                <td>
                  <div className="td-actions">
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => showToast(`Detalle de ${p.id}`)}>Ver</button>
                    {p.status === 'pendiente' && (
                      <button className="btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => showToast(`Aprobando ${p.id}…`)}>Aprobar</button>
                    )}
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
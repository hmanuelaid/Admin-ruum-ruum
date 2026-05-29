'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { mockTrips } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'

const EV_STATUS_LABELS: Record<string, string> = {
  aprobado: 'Aprobada', en_revision: 'En revisión',
  pendiente: 'Pendiente', rechazado: 'Rechazada',
  incompleto: 'Incompleta',
}

export default function EvidenciaPage() {
  const [selected, setSelected] = useState(mockTrips[0].id)
  const [tab, setTab] = useState<'inicial' | 'final'>('inicial')
  const { showToast } = useAppStore()
  const trip = mockTrips.find(t => t.id === selected) ?? mockTrips[0]
  const ev = trip.evidence.find(e => e.type === tab)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Evidencia</h1>
          <p className="page-sub">Revisión visual y documental de traslados</p>
        </div>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        {[
          { label: 'Pendientes',   value: 3, icon: '⏳', color: 'rgba(245,158,11,.12)' },
          { label: 'En revisión',  value: 2, icon: '🔍', color: 'var(--primary-dim)' },
          { label: 'Aprobadas',    value: 4, icon: '✅', color: 'rgba(34,197,94,.12)' },
          { label: 'Incompletas',  value: 1, icon: '⚠️', color: 'rgba(239,68,68,.12)' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="icon" style={{ background: m.color }}>{m.icon}</div>
            <p className="value">{m.value}</p>
            <p className="label">{m.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Lista de viajes */}
        <div className="card" style={{ padding: 12 }}>
          <p className="kicker" style={{ marginBottom: 10, padding: '0 4px' }}>Seleccionar viaje</p>
          <div className="stack">
            {mockTrips.map(t => {
              const hasEv = t.evidence.length > 0
              return (
                <button key={t.id}
                  onClick={() => setSelected(t.id)}
                  style={{
                    background: selected === t.id ? 'var(--primary-dim)' : 'transparent',
                    border: `1px solid ${selected === t.id ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                    cursor: 'pointer', color: 'var(--text)', textAlign: 'left', width: '100%',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <p className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{t.id}</p>
                    <Chip status={hasEv ? 'aprobado' : 'pendiente_carga'}>
                      {hasEv ? 'Con ev.' : 'Sin ev.'}
                    </Chip>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 500 }}>{t.vehicle.brand} {t.vehicle.model}</p>
                  <p className="muted" style={{ fontSize: 11 }}>
                    {t.origin.address.split(',')[0]} → {t.destination.address.split(',')[0]}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Panel de evidencia */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header del viaje */}
          <div className="card card-sm">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{trip.id} · {trip.vehicle.brand} {trip.vehicle.model} {trip.vehicle.year}</p>
                <p className="muted">{trip.origin.address.split(',')[0]} → {trip.destination.address.split(',')[0]}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Chip status={trip.status} />
                <button className="btn-secondary" style={{ fontSize: 12 }}
                  onClick={() => showToast('Descargando evidencia…')}>
                  ↓ Descargar todo
                </button>
              </div>
            </div>
          </div>

          {/* Tabs inicial / final */}
          <div className="tabs">
            {(['inicial', 'final'] as const).map(t => (
              <button key={t} className={`tab${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)}>
                {t === 'inicial' ? '📷 Evidencia inicial' : '📷 Evidencia final'}
              </button>
            ))}
          </div>

          {ev ? (
            <div className="card">
              {/* Fotos */}
              <p className="kicker" style={{ marginBottom: 12 }}>Fotografías</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{
                    aspectRatio: '1', borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    display: 'grid', placeItems: 'center', fontSize: '1.8rem', cursor: 'pointer',
                  }} onClick={() => showToast('Ver foto completa')}>
                    📷
                  </div>
                ))}
              </div>

              {/* Datos */}
              <div className="detail-grid-2" style={{ marginBottom: 16 }}>
                <div className="detail-section">
                  <p className="detail-label">Kilometraje</p>
                  <p className="detail-value">{ev.kmReading?.toLocaleString('es-MX') ?? '—'} km</p>
                </div>
                <div className="detail-section">
                  <p className="detail-label">Combustible</p>
                  <p className="detail-value">{ev.fuelLevel ?? '—'}%</p>
                </div>
                <div className="detail-section">
                  <p className="detail-label">Fecha y hora</p>
                  <p className="detail-value">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleString('es-MX') : '—'}
                  </p>
                </div>
                <div className="detail-section">
                  <p className="detail-label">Estatus</p>
                  <Chip status={ev.status ?? 'pendiente'}>{EV_STATUS_LABELS[ev.status ?? 'pendiente']}</Chip>
                </div>
              </div>

              {ev.notes && (
                <div className="detail-section">
                  <p className="detail-label">Notas del conductor</p>
                  <p className="detail-value">{ev.notes}</p>
                </div>
              )}

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => showToast('Evidencia aprobada ✓')}>
                  ✓ Aprobar evidencia
                </button>
                <button className="btn-secondary" onClick={() => showToast('Marcada como incompleta')}>
                  Marcar incompleta
                </button>
                <button className="btn-secondary" onClick={() => showToast('Solicitud enviada al conductor')}>
                  Solicitar aclaración
                </button>
                <button className="btn-danger" onClick={() => showToast('Evidencia rechazada')}>
                  Rechazar
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <span className="icon">📷</span>
                <p style={{ fontWeight: 600 }}>Sin evidencia {tab}</p>
                <p className="muted">Estará disponible cuando el conductor la cargue</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
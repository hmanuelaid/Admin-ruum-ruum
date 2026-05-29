'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { mockDrivers } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'

const STATUS_LABELS: Record<string, string> = {
  disponible: 'Disponible', en_viaje: 'En viaje',
  pendiente_validacion: 'Pendiente', activo: 'Activo',
  no_disponible: 'No disponible', suspendido: 'Suspendido',
  bloqueado: 'Bloqueado', documentacion_vencida: 'Doc. vencida',
}

export default function ConductoresPage() {
  const [search, setSearch] = useState('')
  const { showToast } = useAppStore()

  const drivers = mockDrivers.filter(d =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search) ||
    d.state.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Conductores</h1>
          <p className="page-sub">{mockDrivers.length} conductores registrados</p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Invitar conductor — próximamente')}>
          + Agregar conductor
        </button>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        {[
          { label: 'Total', value: mockDrivers.length, icon: '👥', color: 'var(--primary-dim)' },
          { label: 'Disponibles', value: mockDrivers.filter(d => d.status === 'disponible').length, icon: '✅', color: 'rgba(34,197,94,.12)' },
          { label: 'En viaje', value: mockDrivers.filter(d => d.status === 'en_viaje').length, icon: '🚗', color: 'rgba(56,189,248,.12)' },
          { label: 'Pendientes', value: mockDrivers.filter(d => d.status === 'pendiente_validacion').length, icon: '⏳', color: 'rgba(245,158,11,.12)' },
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
        <select className="filter-select">
          <option>Cualquier estatus</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="filter-select">
          <option>Cualquier estado</option>
          <option>CDMX</option><option>Jalisco</option>
          <option>Nuevo León</option><option>Quintana Roo</option>
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
            {drivers.map(d => (
              <tr key={d.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
                      🧑
                    </div>
                    <p className="td-bold">{d.name}</p>
                  </div>
                </td>
                <td>
                  <p style={{ fontSize: 13 }}>{d.phone}</p>
                  <span className="td-muted">{d.email}</span>
                </td>
                <td className="td-muted">{d.state}</td>
                <td>
                  {d.rating > 0
                    ? <span style={{ fontWeight: 600 }}>⭐ {d.rating}</span>
                    : <span className="td-muted">—</span>}
                </td>
                <td className="td-bold">{d.tripsCompleted}</td>
                <td className="td-bold">
                  {d.earnings > 0
                    ? `$${d.earnings.toLocaleString('es-MX')}`
                    : <span className="td-muted">—</span>}
                </td>
                <td>
                  {d.certified
                    ? <Chip variant="success">✓ Cert.</Chip>
                    : <Chip variant="warning">Pendiente</Chip>}
                </td>
                <td><Chip status={d.status}>{STATUS_LABELS[d.status]}</Chip></td>
                <td>
                  <div className="td-actions">
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => showToast(`Perfil de ${d.name}`)}>Ver</button>
                    {d.status === 'pendiente_validacion' && (
                      <button className="btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => showToast(`Validando a ${d.name}…`)}>Validar</button>
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
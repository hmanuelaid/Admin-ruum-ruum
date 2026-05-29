'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { mockTrips } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'

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

export default function IncidenciasPage() {
  const [search, setSearch] = useState('')
  const { showToast } = useAppStore()

  const allIncidents = mockTrips.flatMap(t =>
    t.incidents.map(inc => ({ ...inc, trip: t }))
  )

  const filtered = allIncidents.filter(i =>
    !search ||
    i.id.toLowerCase().includes(search.toLowerCase()) ||
    i.tripId.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Incidencias</h1>
          <p className="page-sub">{allIncidents.length} incidencias registradas</p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Nueva incidencia — próximamente')}>
          + Registrar incidencia
        </button>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        {[
          { label: 'Nuevas',          value: allIncidents.filter(i => i.status === 'nueva').length,          icon: '🚨', color: 'rgba(239,68,68,.12)' },
          { label: 'En revisión',     value: allIncidents.filter(i => i.status === 'en_revision').length,    icon: '🔍', color: 'var(--primary-dim)' },
          { label: 'En seguimiento',  value: allIncidents.filter(i => i.status === 'en_seguimiento').length, icon: '👁️', color: 'rgba(245,158,11,.12)' },
          { label: 'Resueltas',       value: allIncidents.filter(i => i.status === 'resuelta').length,       icon: '✅', color: 'rgba(34,197,94,.12)' },
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
          <input placeholder="Buscar por ID, viaje o descripción…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select">
          <option>Cualquier tipo</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k}>{v}</option>)}
        </select>
        <select className="filter-select">
          <option>Cualquier estatus</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k}>{v}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="icon">🎉</span>
            <p style={{ fontWeight: 600 }}>Sin incidencias activas</p>
            <p className="muted">Todo marcha bien por el momento</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Viaje</th><th>Tipo</th><th>Descripción</th>
                <th>Conductor</th><th>Usuario</th><th>Fecha</th><th>Estatus</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inc => (
                <tr key={inc.id}>
                  <td className="mono td-bold">{inc.id}</td>
                  <td className="mono" style={{ color: 'var(--primary)', fontSize: 13 }}>{inc.tripId}</td>
                  <td><Chip variant="warning">{TYPE_LABELS[inc.type]}</Chip></td>
                  <td style={{ maxWidth: 220, fontSize: 13 }}>{inc.description}</td>
                  <td>{inc.trip.driver?.name ?? <span className="td-muted">—</span>}</td>
                  <td>{inc.trip.user.name}</td>
                  <td className="td-muted">
                    {new Date(inc.createdAt).toLocaleDateString('es-MX')}
                  </td>
                  <td><Chip status={inc.status}>{STATUS_LABELS[inc.status]}</Chip></td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => showToast(`Abriendo incidencia ${inc.id}`)}>Ver</button>
                      <button className="btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => showToast('Asignando responsable…')}>Atender</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
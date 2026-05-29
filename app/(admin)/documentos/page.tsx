'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { mockDocuments } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'

const STATUS_LABELS: Record<string, string> = {
  pendiente_carga: 'Pendiente carga', en_revision: 'En revisión',
  aprobado: 'Aprobado', rechazado: 'Rechazado',
  vencido: 'Vencido', requiere_actualizacion: 'Req. actualización',
}

const OWNER_LABELS: Record<string, string> = {
  driver: 'Conductor', user: 'Usuario', company: 'Empresa',
}

export default function DocumentosPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { showToast } = useAppStore()

  const docs = mockDocuments.filter(d => {
    const matchSearch = !search ||
      d.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      d.type.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || d.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="page-sub">{mockDocuments.length} documentos en el sistema</p>
        </div>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        {[
          { label: 'En revisión',  value: mockDocuments.filter(d => d.status === 'en_revision').length,           icon: '🔍', color: 'var(--primary-dim)' },
          { label: 'Aprobados',    value: mockDocuments.filter(d => d.status === 'aprobado').length,               icon: '✅', color: 'rgba(34,197,94,.12)' },
          { label: 'Pendientes',   value: mockDocuments.filter(d => d.status === 'pendiente_carga').length,        icon: '⏳', color: 'rgba(245,158,11,.12)' },
          { label: 'Vencidos',     value: mockDocuments.filter(d => d.status === 'vencido').length,                icon: '⚠️', color: 'rgba(239,68,68,.12)' },
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
          <input placeholder="Buscar por nombre o tipo de documento…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Cualquier estatus</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="filter-select">
          <option>Todos los tipos</option>
          <option>Conductor</option><option>Usuario</option><option>Empresa</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Propietario</th><th>Tipo</th><th>Categoría</th>
              <th>Cargado</th><th>Vence</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id}>
                <td className="td-bold">{d.ownerName}</td>
                <td style={{ fontSize: 13 }}>{d.type}</td>
                <td><Chip variant="default">{OWNER_LABELS[d.ownerType]}</Chip></td>
                <td className="td-muted">
                  {d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('es-MX') : '—'}
                </td>
                <td>
                  {d.expiresAt ? (
                    <span style={{ color: d.status === 'vencido' ? 'var(--danger)' : 'inherit', fontSize: 13 }}>
                      {new Date(d.expiresAt).toLocaleDateString('es-MX')}
                    </span>
                  ) : <span className="td-muted">—</span>}
                </td>
                <td><Chip status={d.status}>{STATUS_LABELS[d.status]}</Chip></td>
                <td>
                  <div className="td-actions">
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => showToast(`Abriendo ${d.type}`)}>Ver</button>
                    {d.status === 'en_revision' && (<>
                      <button className="btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => showToast('Documento aprobado ✓')}>Aprobar</button>
                      <button className="btn-danger" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => showToast('Documento rechazado')}>Rechazar</button>
                    </>)}
                    {d.status === 'vencido' && (
                      <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => showToast('Solicitando actualización…')}>Solicitar</button>
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
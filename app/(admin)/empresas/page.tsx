'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { mockCompanies } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'

export default function EmpresasPage() {
  const [search, setSearch] = useState('')
  const { showToast } = useAppStore()

  const companies = mockCompanies.filter(c =>
    !search ||
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.rfc.toLowerCase().includes(search.toLowerCase()) ||
    c.contactName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p className="page-sub">{mockCompanies.length} empresas registradas</p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Nueva empresa — próximamente')}>
          + Nueva empresa
        </button>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        {[
          { label: 'Total',       value: mockCompanies.length,                                             icon: '🏢', color: 'var(--primary-dim)' },
          { label: 'Activas',     value: mockCompanies.filter(c => c.status === 'activo').length,          icon: '✅', color: 'rgba(34,197,94,.12)' },
          { label: 'Suspendidas', value: mockCompanies.filter(c => c.status === 'suspendido').length,      icon: '🚫', color: 'rgba(239,68,68,.12)' },
          { label: 'Viajes total',value: mockCompanies.reduce((s, c) => s + c.tripsCount, 0),              icon: '🚗', color: 'rgba(56,189,248,.12)' },
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
          <input placeholder="Buscar por nombre, RFC o contacto…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select">
          <option>Cualquier tipo</option>
          <option>Agencia automotriz</option><option>Lote de autos</option>
          <option>Arrendadora</option><option>Flotilla</option>
          <option>Taller</option><option>Aseguradora</option>
        </select>
        <select className="filter-select">
          <option>Cualquier estatus</option>
          <option>Activa</option><option>Suspendida</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Empresa</th><th>RFC</th><th>Tipo</th><th>Contacto</th>
              <th>Viajes</th><th>Registro</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-dim)', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: '1.1rem' }}>
                      🏢
                    </div>
                    <div>
                      <p className="td-bold">{c.nombre}</p>
                      <p className="td-muted">{c.razonSocial}</p>
                    </div>
                  </div>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>{c.rfc}</td>
                <td><Chip variant="primary">{c.type}</Chip></td>
                <td>
                  <p style={{ fontSize: 13 }}>{c.contactName}</p>
                  <p className="td-muted">{c.email}</p>
                </td>
                <td className="td-bold">{c.tripsCount}</td>
                <td className="td-muted">{new Date(c.createdAt).toLocaleDateString('es-MX')}</td>
                <td>
                  <Chip status={c.status === 'activo' ? 'activo' : 'suspendido'}>
                    {c.status === 'activo' ? 'Activa' : 'Suspendida'}
                  </Chip>
                </td>
                <td>
                  <div className="td-actions">
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => showToast(`Perfil de ${c.nombre}`)}>Ver</button>
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => showToast('Ver viajes de la empresa')}>Viajes</button>
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
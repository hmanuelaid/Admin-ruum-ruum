'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { mockUsers } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'

const TYPE_LABELS: Record<string, string> = {
  personal: 'Personal', empresarial: 'Empresarial', agencia: 'Agencia',
  lote: 'Lote', flotilla: 'Flotilla', arrendadora: 'Arrendadora',
  taller: 'Taller', aseguradora: 'Aseguradora',
}

export default function UsuariosPage() {
  const [search, setSearch] = useState('')
  const { showToast } = useAppStore()

  const users = mockUsers.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-sub">{mockUsers.length} usuarios registrados</p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Invitar usuario — próximamente')}>
          + Invitar usuario
        </button>
      </div>

      {/* Métricas rápidas */}
      <div className="metrics-grid">
        {[
          { label: 'Total', value: mockUsers.length, icon: '👥' },
          { label: 'Activos', value: mockUsers.filter(u => u.status === 'activo').length, icon: '✅' },
          { label: 'Empresariales', value: mockUsers.filter(u => u.type !== 'personal').length, icon: '🏢' },
          { label: 'Suspendidos', value: mockUsers.filter(u => u.status === 'suspendido').length, icon: '🚫' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="icon" style={{ background: 'var(--primary-dim)', fontSize: '1.1rem' }}>{m.icon}</div>
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
          <input placeholder="Buscar por nombre, correo o teléfono…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select">
          <option>Todos los tipos</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k}>{v}</option>)}
        </select>
        <select className="filter-select">
          <option>Cualquier estatus</option>
          <option>Activo</option><option>Suspendido</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Usuario</th><th>Contacto</th><th>Tipo</th>
              <th>Viajes</th><th>Registro</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-dim)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      👤
                    </div>
                    <div>
                      <p className="td-bold">{u.name}</p>
                      {u.company && <span className="td-muted">{u.company}</span>}
                    </div>
                  </div>
                </td>
                <td>
                  <p style={{ fontSize: 13 }}>{u.email}</p>
                  <span className="td-muted">{u.phone}</span>
                </td>
                <td><Chip variant="primary">{TYPE_LABELS[u.type]}</Chip></td>
                <td className="td-bold">{u.tripsCount}</td>
                <td className="td-muted">{new Date(u.createdAt).toLocaleDateString('es-MX')}</td>
                <td>
                  <Chip status={u.status === 'activo' ? 'activo' : 'suspendido'}>
                    {u.status === 'activo' ? 'Activo' : 'Suspendido'}
                  </Chip>
                </td>
                <td>
                  <div className="td-actions">
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => showToast(`Perfil de ${u.name}`)}>Ver</button>
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => showToast('Ver viajes del usuario')}>Viajes</button>
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
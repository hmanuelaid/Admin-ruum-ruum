'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { mockTariffs } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'
import type { Tariff } from '@/lib/types'

export default function TarifasPage() {
  const [tariffs, setTariffs] = useState(mockTariffs)
  const [editing, setEditing] = useState<Tariff | null>(null)
  const { showToast } = useAppStore()

  function toggleActive(id: string) {
    setTariffs(ts => ts.map(t => t.id === id ? { ...t, active: !t.active } : t))
    showToast('Tarifa actualizada')
  }

  function saveEdit() {
    if (!editing) return
    setTariffs(ts => ts.map(t => t.id === editing.id ? editing : t))
    setEditing(null)
    showToast('Cambios guardados ✓')
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tarifas</h1>
          <p className="page-sub">Configuración de precios y pagos al conductor</p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Nueva tarifa — próximamente')}>
          + Nueva tarifa
        </button>
      </div>

      {/* Tarjetas de tarifas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {tariffs.map(t => (
          <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16 }}>{t.name}</p>
                <p className="muted" style={{ fontSize: 12 }}>ID: {t.id}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Chip status={t.active ? 'activo' : 'no_disponible'}>
                  {t.active ? 'Activa' : 'Inactiva'}
                </Chip>
                <button
                  onClick={() => toggleActive(t.id)}
                  style={{
                    width: 42, height: 24, borderRadius: 12,
                    background: t.active ? 'var(--primary)' : 'var(--border)',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background .2s',
                  }}>
                  <span style={{
                    position: 'absolute', top: 2,
                    left: t.active ? 20 : 2,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#fff', transition: 'left .2s',
                  }} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Tarifa base', value: `$${t.baseFare}` },
                { label: 'Por km', value: `$${t.perKm}` },
                { label: 'Mínimo', value: `$${t.minFare}` },
                { label: 'Recargo foráneo', value: `×${t.foraneaSurcharge}` },
              ].map(m => (
                <div key={m.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                  <p className="muted" style={{ fontSize: 11 }}>{m.label}</p>
                  <p style={{ fontWeight: 700, fontSize: 16 }}>{m.value}</p>
                </div>
              ))}
            </div>

            <div className="divider" />
            <p className="kicker">Pago al conductor</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Base conductor', value: `$${t.driverBase}` },
                { label: 'Por km', value: `$${t.driverPerKm}` },
              ].map(m => (
                <div key={m.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                  <p className="muted" style={{ fontSize: 11 }}>{m.label}</p>
                  <p style={{ fontWeight: 700, fontSize: 16 }}>{m.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setEditing(t)}>✏️ Editar</button>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => showToast(`Duplicando ${t.name}…`)}>⧉ Duplicar</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de edición */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontWeight: 700, fontSize: 16 }}>Editar tarifa — {editing.name}</p>
              <button className="btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>

            <div className="form-section">
              <div className="field-group">
                <label className="field-label">Nombre</label>
                <input className="field-input" value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="field-group">
                  <label className="field-label">Tarifa base (MXN)</label>
                  <input className="field-input" type="number" value={editing.baseFare}
                    onChange={e => setEditing({ ...editing, baseFare: +e.target.value })} />
                </div>
                <div className="field-group">
                  <label className="field-label">Por km (MXN)</label>
                  <input className="field-input" type="number" value={editing.perKm}
                    onChange={e => setEditing({ ...editing, perKm: +e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="field-group">
                  <label className="field-label">Tarifa mínima</label>
                  <input className="field-input" type="number" value={editing.minFare}
                    onChange={e => setEditing({ ...editing, minFare: +e.target.value })} />
                </div>
                <div className="field-group">
                  <label className="field-label">Recargo foráneo (×)</label>
                  <input className="field-input" type="number" step="0.05" value={editing.foraneaSurcharge}
                    onChange={e => setEditing({ ...editing, foraneaSurcharge: +e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="field-group">
                  <label className="field-label">Base conductor</label>
                  <input className="field-input" type="number" value={editing.driverBase}
                    onChange={e => setEditing({ ...editing, driverBase: +e.target.value })} />
                </div>
                <div className="field-group">
                  <label className="field-label">Conductor por km</label>
                  <input className="field-input" type="number" step="0.1" value={editing.driverPerKm}
                    onChange={e => setEditing({ ...editing, driverPerKm: +e.target.value })} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={saveEdit}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla comparativa */}
      <div className="card">
        <div className="card-header">
          <p className="card-title">Comparativa de tarifas</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tarifa</th><th>Base</th><th>Por km</th><th>Mínimo</th>
                <th>Foráneo</th><th>Base conductor</th><th>Cond./km</th><th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {tariffs.map(t => (
                <tr key={t.id}>
                  <td className="td-bold">{t.name}</td>
                  <td>${t.baseFare}</td>
                  <td>${t.perKm}</td>
                  <td>${t.minFare}</td>
                  <td>×{t.foraneaSurcharge}</td>
                  <td>${t.driverBase}</td>
                  <td>${t.driverPerKm}</td>
                  <td><Chip status={t.active ? 'activo' : 'no_disponible'}>{t.active ? 'Activa' : 'Inactiva'}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
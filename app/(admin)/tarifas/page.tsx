'use client'
import { useEffect, useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

interface TariffRow {
  id: string
  name: string | null
  base_fare: number | null
  per_km: number | null
  min_fare: number | null
  foranea_surcharge: number | null
  driver_base: number | null
  driver_per_km: number | null
  active: boolean | null
  created_at: string | null
  updated_at: string | null
}

function money(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString('es-MX')}`
}

export default function TarifasPage() {
  const [tariffs, setTariffs] = useState<TariffRow[]>([])
  const [editing, setEditing] = useState<TariffRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const { showToast } = useAppStore()

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function loadTariffs() {
      setLoading(true)
      setError('')

      const { data, error: loadError } = await supabase
        .from('tariffs')
        .select('id,name,base_fare,per_km,min_fare,foranea_surcharge,driver_base,driver_per_km,active,created_at,updated_at')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (loadError) {
        setError(loadError.message)
        setTariffs([])
        showToast(`No se pudieron cargar tarifas: ${loadError.message}`)
      } else {
        setTariffs((data ?? []) as TariffRow[])
      }

      setLoading(false)
    }

    void loadTariffs()

    const channel = supabase
      .channel('admin-tariffs')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tariffs',
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setTariffs(prev => [payload.new as TariffRow, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setTariffs(prev => prev.map(tariff =>
            tariff.id === (payload.new as TariffRow).id ? payload.new as TariffRow : tariff
          ))
          setEditing(prev =>
            prev?.id === (payload.new as TariffRow).id ? payload.new as TariffRow : prev
          )
        } else if (payload.eventType === 'DELETE') {
          setTariffs(prev => prev.filter(tariff => tariff.id !== (payload.old as TariffRow).id))
        }
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [showToast])

  async function toggleActive(tariff: TariffRow) {
    const nextActive = !tariff.active
    setToggling(tariff.id)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('tariffs')
      .update({ active: nextActive, updated_at: new Date().toISOString() })
      .eq('id', tariff.id)

    if (updateError) {
      showToast(`No se pudo actualizar la tarifa: ${updateError.message}`)
    } else {
      setTariffs(prev => prev.map(item =>
        item.id === tariff.id ? { ...item, active: nextActive, updated_at: new Date().toISOString() } : item
      ))
      showToast('Tarifa actualizada')
    }

    setToggling(null)
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('tariffs')
      .update({
        name: editing.name,
        base_fare: Number(editing.base_fare ?? 0),
        per_km: Number(editing.per_km ?? 0),
        min_fare: Number(editing.min_fare ?? 0),
        foranea_surcharge: Number(editing.foranea_surcharge ?? 0),
        driver_base: Number(editing.driver_base ?? 0),
        driver_per_km: Number(editing.driver_per_km ?? 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', editing.id)

    if (updateError) {
      showToast(`No se pudieron guardar cambios: ${updateError.message}`)
    } else {
      setTariffs(prev => prev.map(tariff => tariff.id === editing.id ? editing : tariff))
      setEditing(null)
      showToast('Cambios guardados')
    }

    setSaving(false)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tarifas</h1>
          <p className="page-sub">
            {loading ? 'Cargando tarifas…' : `${tariffs.length} tarifas configuradas`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Nueva tarifa — próximamente')}>
          + Nueva tarifa
        </button>
      </div>

      {/* Tarjetas de tarifas */}
      {loading ? (
        <div className="card"><div className="empty-state"><p className="muted">Cargando tarifas…</p></div></div>
      ) : error ? (
        <div className="card">
          <div className="empty-state">
            <span className="icon">⚠️</span>
            <p style={{ fontWeight: 600 }}>No se pudieron cargar tarifas</p>
            <p className="muted">{error}</p>
          </div>
        </div>
      ) : tariffs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="icon">💸</span>
            <p style={{ fontWeight: 600 }}>Sin tarifas</p>
            <p className="muted">Aún no hay configuraciones de precios.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {tariffs.map(tariff => (
            <div key={tariff.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16 }}>{tariff.name ?? 'Sin nombre'}</p>
                  <p className="muted" style={{ fontSize: 12 }}>ID: {tariff.id}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Chip status={tariff.active ? 'activo' : 'no_disponible'}>
                    {tariff.active ? 'Activa' : 'Inactiva'}
                  </Chip>
                  <button
                    onClick={() => toggleActive(tariff)}
                    disabled={toggling === tariff.id}
                    style={{
                      width: 42, height: 24, borderRadius: 12,
                      background: tariff.active ? 'var(--primary)' : 'var(--border)',
                      border: 'none', cursor: toggling === tariff.id ? 'wait' : 'pointer', position: 'relative',
                      transition: 'background .2s', opacity: toggling === tariff.id ? .65 : 1,
                    }}>
                    <span style={{
                      position: 'absolute', top: 2,
                      left: tariff.active ? 20 : 2,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#fff', transition: 'left .2s',
                    }} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Tarifa base', value: money(tariff.base_fare) },
                  { label: 'Por km', value: money(tariff.per_km) },
                  { label: 'Mínimo', value: money(tariff.min_fare) },
                  { label: 'Recargo foráneo', value: `×${Number(tariff.foranea_surcharge ?? 0)}` },
                ].map(metric => (
                  <div key={metric.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <p className="muted" style={{ fontSize: 11 }}>{metric.label}</p>
                    <p style={{ fontWeight: 700, fontSize: 16 }}>{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="divider" />
              <p className="kicker">Pago al conductor</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Base conductor', value: money(tariff.driver_base) },
                  { label: 'Por km', value: money(tariff.driver_per_km) },
                ].map(metric => (
                  <div key={metric.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <p className="muted" style={{ fontSize: 11 }}>{metric.label}</p>
                    <p style={{ fontWeight: 700, fontSize: 16 }}>{metric.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setEditing({ ...tariff })}>✏️ Editar</button>
                <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => showToast(`Duplicando ${tariff.name ?? 'tarifa'}…`)}>⧉ Duplicar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edición */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 20,
        }} onClick={event => { if (event.target === event.currentTarget) setEditing(null) }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontWeight: 700, fontSize: 16 }}>Editar tarifa — {editing.name}</p>
              <button className="btn-icon" onClick={() => setEditing(null)} aria-label="Cerrar editor">✕</button>
            </div>

            <div className="form-section">
              <div className="field-group">
                <label className="field-label">Nombre</label>
                <input className="field-input" value={editing.name ?? ''}
                  onChange={event => setEditing({ ...editing, name: event.target.value })} />
              </div>
              <div className="form-row">
                <div className="field-group">
                  <label className="field-label">Tarifa base (MXN)</label>
                  <input className="field-input" type="number" value={editing.base_fare ?? 0}
                    onChange={event => setEditing({ ...editing, base_fare: +event.target.value })} />
                </div>
                <div className="field-group">
                  <label className="field-label">Por km (MXN)</label>
                  <input className="field-input" type="number" value={editing.per_km ?? 0}
                    onChange={event => setEditing({ ...editing, per_km: +event.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="field-group">
                  <label className="field-label">Tarifa mínima</label>
                  <input className="field-input" type="number" value={editing.min_fare ?? 0}
                    onChange={event => setEditing({ ...editing, min_fare: +event.target.value })} />
                </div>
                <div className="field-group">
                  <label className="field-label">Recargo foráneo (×)</label>
                  <input className="field-input" type="number" step="0.05" value={editing.foranea_surcharge ?? 0}
                    onChange={event => setEditing({ ...editing, foranea_surcharge: +event.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="field-group">
                  <label className="field-label">Base conductor</label>
                  <input className="field-input" type="number" value={editing.driver_base ?? 0}
                    onChange={event => setEditing({ ...editing, driver_base: +event.target.value })} />
                </div>
                <div className="field-group">
                  <label className="field-label">Conductor por km</label>
                  <input className="field-input" type="number" step="0.1" value={editing.driver_per_km ?? 0}
                    onChange={event => setEditing({ ...editing, driver_per_km: +event.target.value })} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                disabled={saving}
                onClick={saveEdit}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
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
              {tariffs.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <p className="muted">Sin tarifas para comparar.</p>
                  </div>
                </td></tr>
              ) : tariffs.map(tariff => (
                <tr key={tariff.id}>
                  <td className="td-bold">{tariff.name ?? 'Sin nombre'}</td>
                  <td>{money(tariff.base_fare)}</td>
                  <td>{money(tariff.per_km)}</td>
                  <td>{money(tariff.min_fare)}</td>
                  <td>×{Number(tariff.foranea_surcharge ?? 0)}</td>
                  <td>{money(tariff.driver_base)}</td>
                  <td>{money(tariff.driver_per_km)}</td>
                  <td><Chip status={tariff.active ? 'activo' : 'no_disponible'}>{tariff.active ? 'Activa' : 'Inactiva'}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

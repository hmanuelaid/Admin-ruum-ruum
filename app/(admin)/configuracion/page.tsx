'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { useAuthStore } from '@/lib/store'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface SystemConfig {
  id: string
  key: string
  value: string
  label: string
  description: string | null
  type: 'number' | 'text' | 'boolean' | 'percent'
  group: string
}

interface ConfigRow {
  id: string
  key: string
  value: string
}

// ── Configuración por defecto (si no existe en BD) ────────────────────────────
const DEFAULT_CONFIG: Omit<SystemConfig, 'id'>[] = [
  // Tarifas
  { key: 'tarifa_base_mxn',         value: '150',  label: 'Tarifa base',              description: 'Cobro mínimo por servicio en MXN',              type: 'number',  group: 'Tarifas' },
  { key: 'tarifa_km_mxn',           value: '18',   label: 'Costo por kilómetro',      description: 'MXN adicionales por km recorrido',               type: 'number',  group: 'Tarifas' },
  { key: 'comision_conductor_pct',  value: '75',   label: 'Comisión conductor (%)',   description: 'Porcentaje de la tarifa que recibe el conductor', type: 'percent', group: 'Tarifas' },
  { key: 'iva_pct',                 value: '16',   label: 'IVA (%)',                  description: 'Porcentaje de IVA aplicado al cobro al cliente',  type: 'percent', group: 'Tarifas' },
  // Operación
  { key: 'tiempo_asignacion_min',   value: '15',   label: 'Tiempo límite asignación', description: 'Minutos antes de alertar un viaje sin conductor', type: 'number',  group: 'Operación' },
  { key: 'radio_busqueda_km',       value: '25',   label: 'Radio búsqueda conductor', description: 'Kilómetros máximos para buscar conductor cercano', type: 'number',  group: 'Operación' },
  { key: 'max_incidencias_conductor', value: '3',  label: 'Máx. incidencias conductor', description: 'Incidencias antes de suspender automáticamente', type: 'number', group: 'Operación' },
  { key: 'requiere_evidencia_inicial', value: 'true', label: 'Evidencia inicial requerida', description: 'El conductor debe subir fotos antes del traslado', type: 'boolean', group: 'Operación' },
  { key: 'requiere_evidencia_final',   value: 'true', label: 'Evidencia final requerida',   description: 'El conductor debe subir fotos al entregar',       type: 'boolean', group: 'Operación' },
  // Notificaciones
  { key: 'notif_viaje_sin_conductor', value: 'true', label: 'Alerta viaje sin conductor', description: 'Notificar cuando un viaje lleva más del tiempo límite sin conductor', type: 'boolean', group: 'Notificaciones' },
  { key: 'notif_incidencia_nueva',    value: 'true', label: 'Alerta incidencia nueva',    description: 'Notificar cuando se registra una nueva incidencia',   type: 'boolean', group: 'Notificaciones' },
  { key: 'notif_doc_vencido',         value: 'true', label: 'Alerta documento vencido',   description: 'Notificar cuando un documento de conductor vence',    type: 'boolean', group: 'Notificaciones' },
]

// ── Componente ─────────────────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const { showToast } = useAppStore()
  const { admin } = useAuthStore()
  const isSuperAdmin = admin?.role === 'super_admin'

  const [configs,  setConfigs]  = useState<SystemConfig[]>([])
  const [edits,    setEdits]    = useState<Record<string, string>>({})
  const [dirty,    setDirty]    = useState<Set<string>>(new Set())
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [activeGroup, setActiveGroup] = useState('Tarifas')

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('system_config')
      .select('id, key, value')

    if (error && error.code !== 'PGRST116') {
      // Tabla no existe aún — usar defaults locales
      const local = DEFAULT_CONFIG.map((c, i) => ({ ...c, id: `local-${i}` }))
      setConfigs(local)
      setEdits(Object.fromEntries(local.map(c => [c.key, c.value])))
      setLoading(false)
      return
    }

    const dbMap: Record<string, string> = {}
    ;(data ?? []).forEach((r: ConfigRow) => { dbMap[r.key] = r.value })

    const merged: SystemConfig[] = DEFAULT_CONFIG.map((c, i) => ({
      ...c,
      id: (data ?? []).find((r: ConfigRow) => r.key === c.key)?.id ?? `local-${i}`,
      value: dbMap[c.key] ?? c.value,
    }))

    setConfigs(merged)
    setEdits(Object.fromEntries(merged.map(c => [c.key, c.value])))
    setLoading(false)
  }, [])

  useEffect(() => { void loadConfig() }, [loadConfig])

  function handleChange(key: string, value: string) {
    setEdits(prev => ({ ...prev, [key]: value }))
    setDirty(prev => new Set(prev).add(key))
  }

  async function handleSave() {
    if (!isSuperAdmin) return
    setSaving(true)
    const supabase = createClient()

    const toUpsert = configs
      .filter(c => dirty.has(c.key))
      .map(c => ({ key: c.key, value: edits[c.key] ?? c.value }))

    if (toUpsert.length === 0) {
      showToast('Sin cambios pendientes')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('system_config')
      .upsert(toUpsert, { onConflict: 'key' })

    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setDirty(new Set())
      showToast(`✅ ${toUpsert.length} parámetro(s) guardados`)
      void loadConfig()
    }
    setSaving(false)
  }

  function handleReset() {
    setEdits(Object.fromEntries(configs.map(c => [c.key, c.value])))
    setDirty(new Set())
  }

  const groups = [...new Set(DEFAULT_CONFIG.map(c => c.group))]
  const visibleConfigs = configs.filter(c => c.group === activeGroup)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-sub">Parámetros operativos del sistema · solo super_admin</p>
        </div>
        {isSuperAdmin && dirty.size > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={handleReset} disabled={saving}>
              Descartar cambios
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : `Guardar ${dirty.size} cambio(s)`}
            </button>
          </div>
        )}
      </div>

      {!isSuperAdmin && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,.08)', borderRadius: 8, marginBottom: 20, fontSize: 13, color: 'var(--danger)' }}>
          ⚠️ Solo el super_admin puede modificar la configuración. Estás en modo lectura.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Sidebar de grupos */}
        <div className="table-wrap" style={{ padding: '8px 0' }}>
          {groups.map(group => (
            <button key={group} onClick={() => setActiveGroup(group)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 16px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 13,
                fontWeight: activeGroup === group ? 600 : 400,
                color: activeGroup === group ? 'var(--primary)' : 'var(--text)',
                borderLeft: activeGroup === group ? '3px solid var(--primary)' : '3px solid transparent',
              }}>
              {group}
              {dirty.size > 0 && configs.filter(c => c.group === group && dirty.has(c.key)).length > 0 && (
                <span className="nav-badge" style={{ marginLeft: 6 }}>
                  {configs.filter(c => c.group === group && dirty.has(c.key)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Panel de configuración */}
        <div className="table-wrap" style={{ padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>{activeGroup}</p>

          {loading ? (
            <div className="empty-state"><p className="muted">Cargando configuración…</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {visibleConfigs.map(config => {
                const isDirty = dirty.has(config.key)
                const val = edits[config.key] ?? config.value

                return (
                  <div key={config.key} style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, alignItems: 'start', paddingBottom: 20, borderBottom: '0.5px solid var(--border)' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                        {config.label}
                        {isDirty && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--warning)', fontWeight: 700 }}>● MODIFICADO</span>}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{config.description}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>{config.key}</p>
                    </div>

                    <div>
                      {config.type === 'boolean' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          {['true', 'false'].map(opt => (
                            <button key={opt} disabled={!isSuperAdmin}
                              onClick={() => handleChange(config.key, opt)}
                              style={{
                                flex: 1, padding: '8px', fontSize: 12, borderRadius: 6,
                                border: `1px solid ${val === opt ? 'var(--primary)' : 'var(--border)'}`,
                                background: val === opt ? 'var(--primary-dim)' : 'var(--surface-2)',
                                color: val === opt ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: isSuperAdmin ? 'pointer' : 'not-allowed', fontWeight: val === opt ? 600 : 400,
                              }}>
                              {opt === 'true' ? '✓ Sí' : '✗ No'}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <input
                            type={config.type === 'number' || config.type === 'percent' ? 'number' : 'text'}
                            value={val}
                            onChange={e => handleChange(config.key, e.target.value)}
                            disabled={!isSuperAdmin}
                            min={0}
                            style={{
                              width: '100%', padding: '8px 12px',
                              paddingRight: config.type === 'percent' ? '32px' : config.type === 'number' ? '40px' : '12px',
                              fontSize: 13, borderRadius: 6,
                              border: `1px solid ${isDirty ? 'var(--primary)' : 'var(--border)'}`,
                              background: 'var(--surface-2)', color: 'var(--text)',
                              fontFamily: 'inherit',
                            }}
                          />
                          {(config.type === 'percent') && (
                            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                          )}
                          {(config.type === 'number' && config.key.includes('mxn')) && (
                            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>MXN</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* SQL helper */}
      <div className="table-wrap" style={{ padding: '1rem 1.25rem', marginTop: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>SQL — crear tabla system_config</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Ejecuta esto en Supabase si la tabla no existe aún:</p>
        <pre style={{ fontSize: 11, background: 'var(--surface-2)', padding: '12px', borderRadius: 6, overflow: 'auto', lineHeight: 1.6, color: 'var(--text)' }}>
{`create table public.system_config (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  value      text not null,
  updated_at timestamptz default now()
);
alter table public.system_config enable row level security;
create policy "Solo admins" on public.system_config for all using (true);`}
        </pre>
      </div>
    </>
  )
}
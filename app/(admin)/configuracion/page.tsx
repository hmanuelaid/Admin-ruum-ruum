'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import {
  getConfigGroups,
  validateSystemConfigValue,
  type SystemConfigItem,
} from '@/lib/config/system-config'

type ConfigApiResponse = {
  configs?: SystemConfigItem[]
  sourceAvailable?: boolean
  error?: {
    code?: string
    message?: string
  } | null
  errors?: Record<string, string>
  saved?: number
}

async function readConfigResponse(response: Response): Promise<ConfigApiResponse> {
  const payload = await response.json().catch(() => ({}))
  return payload as ConfigApiResponse
}

export default function ConfiguracionPage() {
  const { showToast } = useAppStore()

  const [configs, setConfigs] = useState<SystemConfigItem[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [sourceAvailable, setSourceAvailable] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeGroup, setActiveGroup] = useState('Tarifas')

  const loadConfig = useCallback(async () => {
    setLoading(true)
    setConfigError(null)

    try {
      const response = await fetch('/api/admin/system-config', { cache: 'no-store' })
      const payload = await readConfigResponse(response)

      if (!payload.configs) {
        throw new Error(payload.error?.message ?? 'No se pudo cargar configuracion')
      }

      setConfigs(payload.configs)
      setEdits(Object.fromEntries(payload.configs.map(config => [config.key, config.value])))
      setDirty(new Set())
      setValidationErrors({})
      setSourceAvailable(Boolean(payload.sourceAvailable))

      if (!response.ok || !payload.sourceAvailable) {
        setConfigError(payload.error?.message ?? 'La fuente real de configuracion no esta disponible')
      }
    } catch (error) {
      setConfigs([])
      setEdits({})
      setSourceAvailable(false)
      setConfigError(error instanceof Error ? error.message : 'No se pudo cargar configuracion')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => void loadConfig())
  }, [loadConfig])

  function handleChange(key: string, value: string) {
    setEdits(prev => ({ ...prev, [key]: value }))
    setDirty(prev => new Set(prev).add(key))
    setValidationErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function handleSave() {
    if (!sourceAvailable) {
      showToast('No se puede guardar: system_config no esta disponible')
      return
    }

    const toUpsert = configs
      .filter(config => dirty.has(config.key))
      .map(config => ({ key: config.key, value: edits[config.key] ?? config.value }))

    if (toUpsert.length === 0) {
      showToast('Sin cambios pendientes')
      return
    }

    const nextValidationErrors: Record<string, string> = {}
    const normalizedItems = toUpsert.flatMap(item => {
      const result = validateSystemConfigValue(item.key, item.value)
      if (!result.ok) {
        nextValidationErrors[item.key] = result.error
        return []
      }
      return [{ key: item.key, value: result.value }]
    })

    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors)
      showToast('Revisa los parametros fuera de rango')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: normalizedItems }),
      })
      const payload = await readConfigResponse(response)

      if (!response.ok) {
        if (payload.errors) setValidationErrors(payload.errors)
        throw new Error(payload.error?.message ?? 'No se pudo guardar configuracion')
      }

      setDirty(new Set())
      showToast(`${payload.saved ?? normalizedItems.length} parametro(s) guardados`)
      void loadConfig()
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'operacion fallida'}`)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setEdits(Object.fromEntries(configs.map(config => [config.key, config.value])))
    setDirty(new Set())
    setValidationErrors({})
  }

  const groups = useMemo(() => getConfigGroups(), [])
  const visibleConfigs = configs.filter(config => config.group === activeGroup)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-sub">Parámetros operativos del sistema · solo super_admin</p>
        </div>
        {dirty.size > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={handleReset} disabled={saving}>
              Descartar cambios
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || !sourceAvailable}>
              {saving ? 'Guardando...' : `Guardar ${dirty.size} cambio(s)`}
            </button>
          </div>
        )}
      </div>

      {configError && (
        <div className="table-wrap" style={{ padding: '1rem 1.25rem', marginBottom: 16, borderColor: 'var(--danger)' }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--danger)', marginBottom: 4 }}>
            Configuración no disponible para edición
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{configError}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 20, alignItems: 'start' }}>
        <div className="table-wrap" style={{ padding: '8px 0' }}>
          {groups.map(group => {
            const dirtyCount = configs.filter(config => config.group === group && dirty.has(config.key)).length
            return (
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
                {dirtyCount > 0 && <span className="nav-badge" style={{ marginLeft: 6 }}>{dirtyCount}</span>}
              </button>
            )
          })}
        </div>

        <div className="table-wrap" style={{ padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>{activeGroup}</p>

          {loading ? (
            <div className="empty-state"><p className="muted">Cargando configuración...</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {visibleConfigs.map(config => {
                const isDirty = dirty.has(config.key)
                const val = edits[config.key] ?? config.value
                const validationError = validationErrors[config.key]
                const disabled = saving || !sourceAvailable

                return (
                  <div key={config.key} style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, alignItems: 'start', paddingBottom: 20, borderBottom: '0.5px solid var(--border)' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                        {config.label}
                        {isDirty && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--warning)', fontWeight: 700 }}>MODIFICADO</span>}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{config.description}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>{config.key}</p>
                      {validationError && (
                        <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 6 }}>{validationError}</p>
                      )}
                    </div>

                    <div>
                      {config.type === 'boolean' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          {['true', 'false'].map(opt => (
                            <button key={opt}
                              onClick={() => handleChange(config.key, opt)}
                              disabled={disabled}
                              style={{
                                flex: 1, padding: '8px', fontSize: 12, borderRadius: 6,
                                border: `1px solid ${val === opt ? 'var(--primary)' : 'var(--border)'}`,
                                background: val === opt ? 'var(--primary-dim)' : 'var(--surface-2)',
                                color: val === opt ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: val === opt ? 600 : 400,
                                opacity: disabled ? 0.65 : 1,
                              }}>
                              {opt === 'true' ? 'Si' : 'No'}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <input
                            type={config.type === 'number' || config.type === 'percent' ? 'number' : 'text'}
                            value={val}
                            onChange={event => handleChange(config.key, event.target.value)}
                            min={config.min}
                            max={config.max}
                            step={config.integer ? 1 : 0.01}
                            disabled={disabled}
                            style={{
                              width: '100%', padding: '8px 12px',
                              paddingRight: config.type === 'percent' ? '32px' : config.key.includes('mxn') ? '40px' : '12px',
                              fontSize: 13, borderRadius: 6,
                              border: `1px solid ${validationError ? 'var(--danger)' : isDirty ? 'var(--primary)' : 'var(--border)'}`,
                              background: 'var(--surface-2)', color: 'var(--text)',
                              fontFamily: 'inherit', opacity: disabled ? 0.65 : 1,
                            }}
                          />
                          {config.type === 'percent' && (
                            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                          )}
                          {config.key.includes('mxn') && (
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
    </>
  )
}

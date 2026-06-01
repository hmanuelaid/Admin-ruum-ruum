export type ConfigValueType = 'number' | 'text' | 'boolean' | 'percent'

export type SystemConfigDefinition = {
  key: string
  defaultValue: string
  label: string
  description: string
  type: ConfigValueType
  group: string
  min?: number
  max?: number
  integer?: boolean
}

export type SystemConfigItem = {
  id: string
  key: string
  value: string
  label: string
  description: string
  type: ConfigValueType
  group: string
  min?: number
  max?: number
  integer?: boolean
}

export type SystemConfigRow = {
  id: string
  key: string
  value: string
}

export type SystemConfigValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string }

export const CONFIG_DEFINITIONS: readonly SystemConfigDefinition[] = [
  {
    key: 'tarifa_base_mxn',
    defaultValue: '150',
    label: 'Tarifa base',
    description: 'Cobro minimo por servicio en MXN',
    type: 'number',
    group: 'Tarifas',
    min: 0,
    max: 100000,
  },
  {
    key: 'tarifa_km_mxn',
    defaultValue: '18',
    label: 'Costo por kilometro',
    description: 'MXN adicionales por km recorrido',
    type: 'number',
    group: 'Tarifas',
    min: 0,
    max: 10000,
  },
  {
    key: 'comision_conductor_pct',
    defaultValue: '75',
    label: 'Comision conductor (%)',
    description: 'Porcentaje de la tarifa que recibe el conductor',
    type: 'percent',
    group: 'Tarifas',
    min: 0,
    max: 100,
  },
  {
    key: 'iva_pct',
    defaultValue: '16',
    label: 'IVA (%)',
    description: 'Porcentaje de IVA aplicado al cobro al cliente',
    type: 'percent',
    group: 'Tarifas',
    min: 0,
    max: 100,
  },
  {
    key: 'tiempo_asignacion_min',
    defaultValue: '15',
    label: 'Tiempo limite asignacion',
    description: 'Minutos antes de alertar un viaje sin conductor',
    type: 'number',
    group: 'Operacion',
    min: 1,
    max: 1440,
    integer: true,
  },
  {
    key: 'radio_busqueda_km',
    defaultValue: '25',
    label: 'Radio busqueda conductor',
    description: 'Kilometros maximos para buscar conductor cercano',
    type: 'number',
    group: 'Operacion',
    min: 1,
    max: 500,
  },
  {
    key: 'max_incidencias_conductor',
    defaultValue: '3',
    label: 'Max. incidencias conductor',
    description: 'Incidencias antes de suspender automaticamente',
    type: 'number',
    group: 'Operacion',
    min: 0,
    max: 100,
    integer: true,
  },
  {
    key: 'requiere_evidencia_inicial',
    defaultValue: 'true',
    label: 'Evidencia inicial requerida',
    description: 'El conductor debe subir fotos antes del traslado',
    type: 'boolean',
    group: 'Operacion',
  },
  {
    key: 'requiere_evidencia_final',
    defaultValue: 'true',
    label: 'Evidencia final requerida',
    description: 'El conductor debe subir fotos al entregar',
    type: 'boolean',
    group: 'Operacion',
  },
  {
    key: 'notif_viaje_sin_conductor',
    defaultValue: 'true',
    label: 'Alerta viaje sin conductor',
    description: 'Notificar cuando un viaje lleva mas del tiempo limite sin conductor',
    type: 'boolean',
    group: 'Notificaciones',
  },
  {
    key: 'notif_incidencia_nueva',
    defaultValue: 'true',
    label: 'Alerta incidencia nueva',
    description: 'Notificar cuando se registra una nueva incidencia',
    type: 'boolean',
    group: 'Notificaciones',
  },
  {
    key: 'notif_doc_vencido',
    defaultValue: 'true',
    label: 'Alerta documento vencido',
    description: 'Notificar cuando un documento de conductor vence',
    type: 'boolean',
    group: 'Notificaciones',
  },
] as const

const CONFIG_BY_KEY = new Map(CONFIG_DEFINITIONS.map(definition => [definition.key, definition]))

export function getConfigGroups() {
  return Array.from(new Set(CONFIG_DEFINITIONS.map(config => config.group)))
}

export function getConfigDefinition(key: string) {
  return CONFIG_BY_KEY.get(key)
}

export function getSystemConfigKeys() {
  return CONFIG_DEFINITIONS.map(config => config.key)
}

export function getDefaultConfigItems(): SystemConfigItem[] {
  return CONFIG_DEFINITIONS.map((config, index) => ({
    id: `default-${index}`,
    key: config.key,
    value: config.defaultValue,
    label: config.label,
    description: config.description,
    type: config.type,
    group: config.group,
    min: config.min,
    max: config.max,
    integer: config.integer,
  }))
}

export function mergeConfigRows(rows: SystemConfigRow[]): SystemConfigItem[] {
  const rowsByKey = new Map(rows.map(row => [row.key, row]))

  return CONFIG_DEFINITIONS.map((config, index) => {
    const row = rowsByKey.get(config.key)
    return {
      id: row?.id ?? `default-${index}`,
      key: config.key,
      value: row?.value ?? config.defaultValue,
      label: config.label,
      description: config.description,
      type: config.type,
      group: config.group,
      min: config.min,
      max: config.max,
      integer: config.integer,
    }
  })
}

export function validateSystemConfigValue(key: string, rawValue: unknown): SystemConfigValidationResult {
  const definition = getConfigDefinition(key)
  if (!definition) return { ok: false, error: 'Parametro de configuracion no reconocido' }

  if (definition.type === 'boolean') {
    if (typeof rawValue === 'boolean') return { ok: true, value: rawValue ? 'true' : 'false' }
    const normalized = typeof rawValue === 'string' ? rawValue.trim().toLowerCase() : ''
    if (normalized === 'true' || normalized === 'false') return { ok: true, value: normalized }
    return { ok: false, error: `${definition.label} debe ser true o false` }
  }

  const raw = typeof rawValue === 'number' ? String(rawValue) : String(rawValue ?? '').trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return { ok: false, error: `${definition.label} debe ser un numero valido` }
  }

  const value = Number(raw)
  if (!Number.isFinite(value)) {
    return { ok: false, error: `${definition.label} debe ser un numero valido` }
  }

  if (definition.integer && !Number.isInteger(value)) {
    return { ok: false, error: `${definition.label} debe ser un numero entero` }
  }

  if (typeof definition.min === 'number' && value < definition.min) {
    return { ok: false, error: `${definition.label} debe ser mayor o igual a ${definition.min}` }
  }

  if (typeof definition.max === 'number' && value > definition.max) {
    return { ok: false, error: `${definition.label} debe ser menor o igual a ${definition.max}` }
  }

  return { ok: true, value: String(value) }
}

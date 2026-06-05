export const TRIP_STATUSES = [
  'solicitud_recibida',
  'pendiente_revision',
  'pendiente_asignacion',
  'conductor_asignado',
  'conductor_en_camino',
  'recoleccion_proceso',
  'evidencia_inicial_pendiente',
  'traslado_curso',
  'entrega_proceso',
  'evidencia_final_pendiente',
  'finalizado',
  'cancelado',
  'incidente',
] as const

export type TripStatus = typeof TRIP_STATUSES[number]

export function isTripStatus(value: unknown): value is TripStatus {
  return typeof value === 'string' && TRIP_STATUSES.includes(value as TripStatus)
}

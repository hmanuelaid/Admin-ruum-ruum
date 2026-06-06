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

export type TripEvidenceType = 'pickup' | 'delivery'

export const TRIP_NEXT_STATUS: Partial<Record<TripStatus, TripStatus>> = {
  conductor_asignado: 'conductor_en_camino',
  conductor_en_camino: 'recoleccion_proceso',
  recoleccion_proceso: 'evidencia_inicial_pendiente',
  evidencia_inicial_pendiente: 'traslado_curso',
  traslado_curso: 'entrega_proceso',
  entrega_proceso: 'evidencia_final_pendiente',
  evidencia_final_pendiente: 'finalizado',
}

export const TRIP_EVIDENCE_STATUS: Record<TripEvidenceType, TripStatus> = {
  pickup: 'evidencia_inicial_pendiente',
  delivery: 'evidencia_final_pendiente',
}

export const TRIP_REQUIRED_EVIDENCE: Partial<Record<TripStatus, TripEvidenceType>> = {
  traslado_curso: 'pickup',
  finalizado: 'delivery',
}

export const TRIP_STATUS_REQUIRED_EVIDENCE = TRIP_REQUIRED_EVIDENCE

export function isTripEvidenceType(type: unknown): type is TripEvidenceType {
  return type === 'pickup' || type === 'delivery'
}

export function isAllowedTripTransition(current: string, next: string): boolean {
  if (current === next) return true
  if (current === 'cancelado' || current === 'finalizado') return false
  return TRIP_NEXT_STATUS[current as TripStatus] === next
}

export function getRequiredEvidenceForTransition(
  current: TripStatus,
  next: TripStatus
): TripEvidenceType | null {
  if (TRIP_NEXT_STATUS[current] !== next) return null
  return TRIP_REQUIRED_EVIDENCE[next] ?? null
}

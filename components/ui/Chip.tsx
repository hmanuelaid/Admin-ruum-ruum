const MAP: Record<string, string> = {
  // Trip status
  traslado_curso: 'accent', conductor_asignado: 'primary',
  pendiente_asignacion: 'warning', pendiente_revision: 'warning',
  finalizado: 'success', cancelado: 'danger', incidente: 'danger',
  conductor_en_camino: 'primary', recoleccion_proceso: 'warning',
  evidencia_inicial_pendiente: 'warning', entrega_proceso: 'accent',
  evidencia_final_pendiente: 'warning', solicitud_recibida: 'default',
  // Driver status
  disponible: 'success', en_viaje: 'accent', suspendido: 'danger',
  bloqueado: 'danger', pendiente_validacion: 'warning',
  no_disponible: 'default', activo: 'success', documentacion_vencida: 'danger',
  // Doc / payment status
  aprobado: 'success', rechazado: 'danger', en_revision: 'warning',
  pendiente_carga: 'default', vencido: 'danger',
  requiere_actualizacion: 'warning', pendiente: 'warning', pagado: 'success',
  ajustado: 'primary', revocado: 'danger',
  // Incident status
  nueva: 'danger', en_seguimiento: 'warning', resuelta: 'success',
  cerrada: 'default', escalada: 'danger', requiere_informacion: 'warning',
  // User status
  activo_user: 'success',
}

export function Chip({ children, variant = 'default', status }:
  { children?: React.ReactNode; variant?: string; status?: string }) {
  const v = status ? (MAP[status] ?? 'default') : variant
  return <span className={`chip chip-${v}`}>{children}</span>
}
import Link from 'next/link'

export default function ConductorNotFound() {
  return (
    <div className="empty-state" style={{ marginTop: '4rem' }}>
      <span className="icon">!</span>
      <p style={{ fontWeight: 700 }}>Conductor no encontrado</p>
      <p className="muted">El perfil solicitado no existe o ya no está disponible.</p>
      <Link className="btn-primary" href="/conductores" style={{ marginTop: 12 }}>
        Volver a conductores
      </Link>
    </div>
  )
}

'use client'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Vista general de la operación</p>
        </div>
        <Link href="/viajes">
          <button className="btn-primary">+ Nuevo viaje</button>
        </Link>
      </div>

      {/* Métricas vacías */}
      <div className="metrics-grid">
        {[
          { icon: '🚗', label: 'Viajes activos',        value: 0, color: 'var(--accent)'   },
          { icon: '⏳', label: 'Sin conductor',          value: 0, color: 'var(--warning)'  },
          { icon: '✅', label: 'Finalizados hoy',        value: 0, color: 'var(--success)'  },
          { icon: '👤', label: 'Conductores disponibles', value: 0, color: 'var(--primary)'  },
          { icon: '🚨', label: 'Incidencias abiertas',   value: 0, color: 'var(--danger)'   },
          { icon: '📄', label: 'Docs pendientes',        value: 0, color: 'var(--warning)'  },
          { icon: '💳', label: 'Pagos pendientes',       value: 0, color: 'var(--success)'  },
          { icon: '💰', label: 'Ingresos estimados',     value: '$0', color: 'var(--primary)' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="icon" style={{ background: `${m.color}22` }}>{m.icon}</div>
            <p className="value">{m.value}</p>
            <p className="label">{m.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* Viajes activos */}
        <div className="card">
          <div className="card-header">
            <p className="card-title">Viajes activos</p>
            <Link href="/viajes"><button className="btn-ghost">Ver todos →</button></Link>
          </div>
          <div className="empty-state">
            <span className="icon">🚗</span>
            <p style={{ fontWeight: 600 }}>Sin viajes activos</p>
            <p className="muted">Los traslados en curso aparecerán aquí</p>
          </div>
        </div>

        {/* Columna derecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Alertas */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">⚠️ Alertas operativas</p>
              <span className="chip chip-success">0</span>
            </div>
            <div className="empty-state" style={{ padding: '20px 16px' }}>
              <span className="icon">✅</span>
              <p className="muted">Sin alertas por atender</p>
            </div>
          </div>

          {/* Actividad reciente */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">Actividad reciente</p>
            </div>
            <div className="empty-state" style={{ padding: '20px 16px' }}>
              <span className="icon">📋</span>
              <p className="muted">Sin actividad reciente</p>
            </div>
          </div>

        </div>
      </div>

      {/* Próximos viajes */}
      <div className="card">
        <div className="card-header">
          <p className="card-title">📅 Próximos traslados programados</p>
        </div>
        <div className="empty-state">
          <span className="icon">📅</span>
          <p style={{ fontWeight: 600 }}>Sin traslados programados</p>
          <p className="muted">Los viajes agendados aparecerán aquí</p>
        </div>
      </div>
    </>
  )
}
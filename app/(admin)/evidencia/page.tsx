'use client'
import { useEffect, useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

type EvidenceTab = 'inicial' | 'final'
type EvidenceStatus = 'pendiente_carga' | 'en_revision' | 'aprobado' | 'rechazado' | 'vencido' | 'requiere_actualizacion'

interface EvidencePhoto {
  url: string
}

interface TripEvidence {
  id: string
  type: EvidenceTab | 'durante'
  status: EvidenceStatus
  km_reading: number | null
  fuel_level: number | null
  notes: string | null
  created_at: string
  evidence_photos: EvidencePhoto[] | null
}

interface EvidenceTrip {
  id: string
  status: string
  vehicle_brand: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  origin_address: string | null
  destination_address: string | null
  evidence: TripEvidence[] | null
}

const EV_STATUS_LABELS: Record<string, string> = {
  aprobado: 'Aprobada',
  en_revision: 'En revisión',
  pendiente_carga: 'Pendiente',
  rechazado: 'Rechazada',
  vencido: 'Vencida',
  requiere_actualizacion: 'Requiere actualización',
}

function countEvidence(trips: EvidenceTrip[], status: EvidenceStatus) {
  return trips.reduce(
    (total, trip) => total + (trip.evidence ?? []).filter(ev => ev.status === status).length,
    0
  )
}

export default function EvidenciaPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<EvidenceTab>('inicial')
  const [trips, setTrips] = useState<EvidenceTrip[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useAppStore()

  useEffect(() => {
    let cancelled = false

    async function loadEvidence() {
      const supabase = createClient()
      const { data } = await supabase
        .from('trips')
        .select(`
          id,
          status,
          vehicle_brand,
          vehicle_model,
          vehicle_year,
          origin_address,
          destination_address,
          evidence (
            id,
            type,
            status,
            km_reading,
            fuel_level,
            notes,
            created_at,
            evidence_photos (url)
          )
        `)
        .order('created_at', { ascending: false })

      if (cancelled) return
      const rows = (data ?? []) as EvidenceTrip[]
      setTrips(rows)
      setSelected(current => current ?? rows[0]?.id ?? null)
      setLoading(false)
    }

    void loadEvidence()
    return () => { cancelled = true }
  }, [])

  async function updateEvidenceStatus(evidenceId: string, status: EvidenceStatus) {
    const supabase = createClient()
    const { error } = await supabase
      .from('evidence')
      .update({ status })
      .eq('id', evidenceId)

    if (error) {
      showToast('Error al actualizar evidencia')
      return
    }

    setTrips(current => current.map(trip => ({
      ...trip,
      evidence: trip.evidence?.map(ev => ev.id === evidenceId ? { ...ev, status } : ev) ?? null,
    })))
    showToast(status === 'aprobado' ? 'Evidencia aprobada' : 'Evidencia actualizada')
  }

  const trip = trips.find(t => t.id === selected) ?? null
  const ev = trip?.evidence?.find(e => e.type === tab)
  const photos = ev?.evidence_photos ?? []

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Evidencia</h1>
          <p className="page-sub">Revisión visual y documental de traslados</p>
        </div>
      </div>

      <div className="metrics-grid">
        {[
          { label: 'Pendientes',  value: countEvidence(trips, 'pendiente_carga'), icon: '⏳', color: 'rgba(245,158,11,.12)' },
          { label: 'En revisión', value: countEvidence(trips, 'en_revision'), icon: '🔍', color: 'var(--primary-dim)'   },
          { label: 'Aprobadas',   value: countEvidence(trips, 'aprobado'), icon: '✅', color: 'rgba(34,197,94,.12)'  },
          { label: 'Rechazadas',  value: countEvidence(trips, 'rechazado'), icon: '⚠️', color: 'rgba(239,68,68,.12)'  },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="icon" style={{ background: m.color }}>{m.icon}</div>
            <p className="value">{m.value}</p>
            <p className="label">{m.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card">
          <div className="empty-state">
            <p className="muted">Cargando evidencia…</p>
          </div>
        </div>
      ) : trips.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="icon">📷</span>
            <p style={{ fontWeight: 600 }}>Sin evidencia disponible</p>
            <p className="muted">La evidencia de los traslados aparecerá aquí</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
          <div className="card" style={{ padding: 12 }}>
            <p className="kicker" style={{ marginBottom: 10, padding: '0 4px' }}>Seleccionar viaje</p>
            <div className="stack">
              {trips.map(t => {
                const hasEv = (t.evidence ?? []).length > 0
                return (
                  <button key={t.id}
                    onClick={() => setSelected(t.id)}
                    style={{
                      background: selected === t.id ? 'var(--primary-dim)' : 'transparent',
                      border: `1px solid ${selected === t.id ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                      cursor: 'pointer', color: 'var(--text)', textAlign: 'left', width: '100%',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <p className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{t.id}</p>
                      <Chip status={hasEv ? 'aprobado' : 'pendiente_carga'}>
                        {hasEv ? 'Con ev.' : 'Sin ev.'}
                      </Chip>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 500 }}>{t.vehicle_brand} {t.vehicle_model}</p>
                    <p className="muted" style={{ fontSize: 11 }}>
                      {t.origin_address?.split(',')[0]} → {t.destination_address?.split(',')[0]}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {trip && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card card-sm">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{trip.id} · {trip.vehicle_brand} {trip.vehicle_model} {trip.vehicle_year}</p>
                    <p className="muted">{trip.origin_address?.split(',')[0]} → {trip.destination_address?.split(',')[0]}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Chip status={trip.status} />
                    <button className="btn-secondary" style={{ fontSize: 12 }}
                      onClick={() => showToast('Descarga masiva próximamente')}>
                      ↓ Descargar todo
                    </button>
                  </div>
                </div>
              </div>

              <div className="tabs">
                {(['inicial', 'final'] as const).map(t => (
                  <button key={t} className={`tab${tab === t ? ' active' : ''}`}
                    onClick={() => setTab(t)}>
                    {t === 'inicial' ? '📷 Evidencia inicial' : '📷 Evidencia final'}
                  </button>
                ))}
              </div>

              {ev ? (
                <div className="card">
                  <p className="kicker" style={{ marginBottom: 12 }}>Fotografías</p>
                  {photos.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                      {photos.map(photo => (
                        <a key={photo.url}
                          href={photo.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            aspectRatio: '1', borderRadius: 'var(--radius-sm)',
                            background: `var(--surface-2) url(${photo.url}) center / cover`,
                            border: '1px solid var(--border)',
                            display: 'block',
                          }}
                          aria-label="Ver foto completa"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state" style={{ marginBottom: 20 }}>
                      <span className="icon">📷</span>
                      <p className="muted">Registro sin fotos asociadas</p>
                    </div>
                  )}

                  <div className="detail-grid-2" style={{ marginBottom: 16 }}>
                    <div className="detail-section">
                      <p className="detail-label">Kilometraje</p>
                      <p className="detail-value">{ev.km_reading?.toLocaleString('es-MX') ?? '—'} km</p>
                    </div>
                    <div className="detail-section">
                      <p className="detail-label">Combustible</p>
                      <p className="detail-value">{ev.fuel_level ?? '—'}%</p>
                    </div>
                    <div className="detail-section">
                      <p className="detail-label">Fecha y hora</p>
                      <p className="detail-value">
                        {new Date(ev.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div className="detail-section">
                      <p className="detail-label">Estatus</p>
                      <Chip status={ev.status}>{EV_STATUS_LABELS[ev.status]}</Chip>
                    </div>
                  </div>

                  {ev.notes && (
                    <div className="detail-section">
                      <p className="detail-label">Notas del conductor</p>
                      <p className="detail-value">{ev.notes}</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                    <button className="btn-primary" onClick={() => updateEvidenceStatus(ev.id, 'aprobado')}>✓ Aprobar</button>
                    <button className="btn-secondary" onClick={() => updateEvidenceStatus(ev.id, 'requiere_actualizacion')}>Solicitar actualización</button>
                    <button className="btn-danger" onClick={() => updateEvidenceStatus(ev.id, 'rechazado')}>Rechazar</button>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="empty-state">
                    <span className="icon">📷</span>
                    <p style={{ fontWeight: 600 }}>Sin evidencia {tab}</p>
                    <p className="muted">Estará disponible cuando el conductor la cargue</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

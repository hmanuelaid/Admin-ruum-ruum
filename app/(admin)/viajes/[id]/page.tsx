'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Chip } from '@/components/ui/Chip'
import { useAppStore } from '@/lib/store'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface TripDetail {
  id: string
  status: string | null
  service_type: string | null
  origin_address: string | null
  destination_address: string | null
  distance_km: number | null
  client_price_mxn: number | null
  driver_pay_mxn: number | null
  scheduled_at: string | null
  created_at: string | null
  updated_at: string | null
  internal_notes: string | null
  vehicle_brand: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_plates: string | null
  driver_id: string | null
  user_id: string | null
}

interface RelatedUser   { id: string; name: string | null; email: string | null; phone: string | null }
interface RelatedDriver { id: string; name: string | null; phone: string | null; status: string | null }
interface RelatedDoc    { id: string; type: string; status: string; file_url: string | null }
interface RelatedInc    { id: string; type: string; status: string; description: string; created_at: string | null }
interface RelatedPay    { id: string; type: string; amount: number; status: string; concept: string }
interface DriverOption  { id: string; name: string | null }

// ── Catálogos ──────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  solicitud_recibida: 'Solicitud recibida', pendiente_revision: 'En revisión',
  pendiente_asignacion: 'Sin conductor', conductor_asignado: 'Conductor asignado',
  conductor_en_camino: 'En camino', recoleccion_proceso: 'Recolección',
  evidencia_inicial_pendiente: 'Ev. inicial pendiente', traslado_curso: 'En tránsito',
  entrega_proceso: 'Entrega', evidencia_final_pendiente: 'Ev. final pendiente',
  finalizado: 'Finalizado', cancelado: 'Cancelado', incidente: 'Incidente',
}

const SERVICE_LABELS: Record<string, string> = {
  personal: 'Personal', empresarial: 'Empresarial', agencia: 'Agencia',
  lote: 'Lote', flotilla: 'Flotilla', entrega_cliente: 'Entrega a cliente',
  recuperacion: 'Recuperación', especial: 'Especial',
}

const PENDING = ['solicitud_recibida', 'pendiente_revision', 'pendiente_asignacion']

function money(v: number | null) {
  return v ? `$${Number(v).toLocaleString('es-MX')}` : '—'
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function ViajeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useAppStore()

  const [trip,        setTrip]        = useState<TripDetail | null>(null)
  const [user,        setUser]        = useState<RelatedUser | null>(null)
  const [driver,      setDriver]      = useState<RelatedDriver | null>(null)
  const [docs,        setDocs]        = useState<RelatedDoc[]>([])
  const [incidents,   setIncidents]   = useState<RelatedInc[]>([])
  const [payments,    setPayments]    = useState<RelatedPay[]>([])
  const [driverOpts,  setDriverOpts]  = useState<DriverOption[]>([])
  const [tab,         setTab]         = useState<'info' | 'evidencia' | 'incidencias' | 'pagos'>('info')
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [notes,       setNotes]       = useState('')
  const [editingNotes, setEditingNotes] = useState(false)

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      const [tripRes, docsRes, incRes, payRes, driversRes] = await Promise.all([
        supabase.from('trips').select('*').eq('id', id).single(),
        supabase.from('documents').select('id, type, status, file_url').eq('trip_id', id),
        supabase.from('incidents').select('id, type, status, description, created_at').eq('trip_id', id).order('created_at', { ascending: false }),
        supabase.from('payments').select('id, type, amount, status, concept').eq('trip_id', id),
        supabase.from('drivers').select('id, name').in('status', ['disponible', 'activo']).order('name'),
      ])

      if (tripRes.error || !tripRes.data) {
        showToast('No se pudo cargar el viaje')
        router.back()
        return
      }

      const t = tripRes.data as TripDetail
      setTrip(t)
      setNotes(t.internal_notes ?? '')
      setDocs((docsRes.data ?? []) as RelatedDoc[])
      setIncidents((incRes.data ?? []) as RelatedInc[])
      setPayments((payRes.data ?? []) as RelatedPay[])
      setDriverOpts((driversRes.data ?? []) as DriverOption[])

      // Cargar usuario y conductor en paralelo si existen
      const [userRes, driverRes] = await Promise.all([
        t.user_id   ? supabase.from('app_users').select('id, name, email, phone').eq('id', t.user_id).single()   : Promise.resolve(null),
        t.driver_id ? supabase.from('drivers').select('id, name, phone, status').eq('id', t.driver_id).single() : Promise.resolve(null),
      ])

      if (userRes?.data)   setUser(userRes.data as RelatedUser)
      if (driverRes?.data) setDriver(driverRes.data as RelatedDriver)

      setLoading(false)
    }

    void load()
  }, [id, router, showToast])

  // ── Cambiar estatus ────────────────────────────────────────────────────────
  async function handleStatusChange(newStatus: string) {
    if (!trip) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('trips')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setTrip(prev => prev ? { ...prev, status: newStatus } : prev)
      showToast(`Estatus actualizado a "${STATUS_LABELS[newStatus] ?? newStatus}"`)
    }
    setSaving(false)
  }

  // ── Asignar conductor ──────────────────────────────────────────────────────
  async function handleAssignDriver(driverId: string) {
    if (!driverId) return
    setSaving(true)
    const supabase = createClient()
    const now = new Date().toISOString()

    const [tripUpdate, driverUpdate] = await Promise.all([
      supabase.from('trips').update({ driver_id: driverId, status: 'conductor_asignado', updated_at: now }).eq('id', id),
      supabase.from('drivers').update({ status: 'en_viaje' }).eq('id', driverId),
    ])

    if (tripUpdate.error) {
      showToast(`Error: ${tripUpdate.error.message}`)
    } else {
      const selected = driverOpts.find(d => d.id === driverId)
      setTrip(prev => prev ? { ...prev, driver_id: driverId, status: 'conductor_asignado' } : prev)
      setDriver({ id: driverId, name: selected?.name ?? null, phone: null, status: 'en_viaje' })
      showToast(`✅ Conductor ${selected?.name ?? ''} asignado`)
    }
    setSaving(false)
  }

  // ── Guardar notas ──────────────────────────────────────────────────────────
  async function handleSaveNotes() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('trips')
      .update({ internal_notes: notes })
      .eq('id', id)

    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setTrip(prev => prev ? { ...prev, internal_notes: notes } : prev)
      setEditingNotes(false)
      showToast('✅ Notas guardadas')
    }
    setSaving(false)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="empty-state" style={{ marginTop: '4rem' }}>
        <p className="muted">Cargando detalle del viaje…</p>
      </div>
    )
  }

  if (!trip) return null

  const status = trip.status ?? ''
  const isPending = PENDING.includes(status)
  const shortId = trip.id.slice(0, 8).toUpperCase()

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-icon" onClick={() => router.back()} title="Regresar">
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="page-title">Viaje #{shortId}</h1>
            <p className="page-sub">
              {SERVICE_LABELS[trip.service_type ?? ''] ?? 'Traslado'} · {trip.created_at ? new Date(trip.created_at).toLocaleDateString('es-MX', { dateStyle: 'long' }) : '—'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="filter-select"
            value={status}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={saving}
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <Chip status={status}>{STATUS_LABELS[status] ?? status}</Chip>
        </div>
      </div>

      {/* Métricas */}
      <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Tarifa cliente',   value: money(trip.client_price_mxn) },
          { label: 'Pago conductor',   value: money(trip.driver_pay_mxn)   },
          { label: 'Distancia',        value: trip.distance_km ? `${trip.distance_km} km` : '—' },
          { label: 'Incidencias',      value: incidents.length },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="icon" style={{ background: 'var(--primary-dim)', fontSize: 20 }}>—</div>
            <p className="value">{m.value}</p>
            <p className="label">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Grid de info principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '1.5rem' }}>

        {/* Ruta y vehículo */}
        <div className="table-wrap" style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Ruta y vehículo</p>
          {[
            ['Origen',      trip.origin_address      ?? '—'],
            ['Destino',     trip.destination_address  ?? '—'],
            ['Vehículo',    `${trip.vehicle_brand ?? ''} ${trip.vehicle_model ?? ''} ${trip.vehicle_year ?? ''}`.trim() || '—'],
            ['Placas',      trip.vehicle_plates       ?? '—'],
            ['Servicio',    SERVICE_LABELS[trip.service_type ?? ''] ?? '—'],
            ['Programado',  trip.scheduled_at ? new Date(trip.scheduled_at).toLocaleString('es-MX') : 'No programado'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13, gap: 8 }}>
              <span className="muted" style={{ flexShrink: 0 }}>{label}</span>
              <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Partes involucradas */}
        <div className="table-wrap" style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Partes involucradas</p>

          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Usuario</p>
          {user ? (
            <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '0.5px solid var(--border)' }}>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{user.name ?? '—'}</p>
              <p className="td-muted">{user.email ?? '—'}</p>
              <p className="td-muted">{user.phone ?? '—'}</p>
            </div>
          ) : <p className="td-muted" style={{ marginBottom: 12 }}>Sin usuario asignado</p>}

          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Conductor</p>
          {driver ? (
            <div>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{driver.name ?? '—'}</p>
              <p className="td-muted">{driver.phone ?? '—'}</p>
              <Chip status={driver.status ?? undefined} style={{ marginTop: 4 }}>{driver.status ?? '—'}</Chip>
            </div>
          ) : isPending && driverOpts.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                className="filter-select"
                defaultValue=""
                onChange={e => e.target.value && handleAssignDriver(e.target.value)}
                disabled={saving}
                style={{ flex: 1 }}
              >
                <option value="">Seleccionar conductor…</option>
                {driverOpts.map(d => (
                  <option key={d.id} value={d.id}>{d.name ?? d.id}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="td-muted">Sin conductor asignado</p>
          )}
        </div>
      </div>

      {/* Notas internas */}
      <div className="table-wrap" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontWeight: 600, fontSize: 13 }}>Notas internas</p>
          {!editingNotes && (
            <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }}
              onClick={() => setEditingNotes(true)}>✏️ Editar</button>
          )}
        </div>
        {editingNotes ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas internas del viaje…"
              rows={3}
              style={{ width: '100%', resize: 'vertical', fontSize: 13, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" style={{ fontSize: 12 }} onClick={handleSaveNotes} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setEditingNotes(false); setNotes(trip.internal_notes ?? '') }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: notes ? 'var(--text)' : 'var(--text-muted)', lineHeight: 1.6 }}>
            {notes || 'Sin notas internas'}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        {([
          { key: 'info',        label: 'Evidencia' },
          { key: 'incidencias', label: `Incidencias${incidents.length > 0 ? ` (${incidents.length})` : ''}` },
          { key: 'pagos',       label: `Pagos (${payments.length})` },
        ] as { key: typeof tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 16px', fontSize: 13,
            fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Evidencia / Documentos */}
      {tab === 'info' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Tipo</th><th>Estatus</th><th></th></tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr><td colSpan={3}>
                  <div className="empty-state"><p className="muted">Sin documentos de evidencia</p></div>
                </td></tr>
              ) : docs.map(doc => (
                <tr key={doc.id}>
                  <td className="td-bold">{doc.type}</td>
                  <td><Chip status={doc.status}>{doc.status}</Chip></td>
                  <td>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noreferrer"
                        className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}>
                        Ver archivo
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Incidencias */}
      {tab === 'incidencias' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Tipo</th><th>Descripción</th><th>Estatus</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="empty-state"><p className="muted">Sin incidencias registradas</p></div>
                </td></tr>
              ) : incidents.map(inc => (
                <tr key={inc.id}>
                  <td className="td-bold">{inc.type}</td>
                  <td style={{ maxWidth: 240, fontSize: 13 }}>{inc.description}</td>
                  <td><Chip status={inc.status}>{inc.status}</Chip></td>
                  <td className="td-muted">
                    {inc.created_at ? new Date(inc.created_at).toLocaleDateString('es-MX') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Pagos */}
      {tab === 'pagos' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Concepto</th><th>Tipo</th><th>Monto</th><th>Estatus</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="empty-state"><p className="muted">Sin pagos registrados</p></div>
                </td></tr>
              ) : payments.map(pay => (
                <tr key={pay.id}>
                  <td className="td-bold">{pay.concept}</td>
                  <td className="td-muted">{pay.type}</td>
                  <td className="td-bold">{money(pay.amount)}</td>
                  <td><Chip status={pay.status}>{pay.status}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
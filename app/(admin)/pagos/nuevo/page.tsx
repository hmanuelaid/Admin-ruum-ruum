'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { useActivityLog } from '@/lib/useActivityLog'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface DriverOption { id: string; name: string | null }
interface UserOption   { id: string; name: string | null }
interface TripOption   { id: string; label: string }

const TYPE_OPTIONS = [
  { value: 'pago_conductor',  label: 'Pago a conductor'  },
  { value: 'cobro_usuario',   label: 'Cobro a usuario'   },
  { value: 'reembolso',       label: 'Reembolso'         },
  { value: 'ajuste',          label: 'Ajuste'            },
  { value: 'penalizacion',    label: 'Penalización'      },
  { value: 'bono',            label: 'Bono'              },
]

const STATUS_OPTIONS = [
  { value: 'pendiente',   label: 'Pendiente'   },
  { value: 'pagado',      label: 'Pagado'      },
  { value: 'en_revision', label: 'En revisión' },
]

// ── Componente ─────────────────────────────────────────────────────────────────
export default function NuevoPagoPage() {
  const router = useRouter()
  const { showToast } = useAppStore()
  const { log } = useActivityLog()

  // Formulario
  const [type,      setType]      = useState('pago_conductor')
  const [status,    setStatus]    = useState('pendiente')
  const [amount,    setAmount]    = useState('')
  const [concept,   setConcept]   = useState('')
  const [notes,     setNotes]     = useState('')
  const [driverId,  setDriverId]  = useState('')
  const [userId,    setUserId]    = useState('')
  const [tripId,    setTripId]    = useState('')

  // Opciones
  const [drivers,   setDrivers]   = useState<DriverOption[]>([])
  const [users,     setUsers]     = useState<UserOption[]>([])
  const [trips,     setTrips]     = useState<TripOption[]>([])

  const [saving,    setSaving]    = useState(false)
  const [loadingOpts, setLoadingOpts] = useState(true)

  // ── Cargar opciones ────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadOpts() {
      const supabase = createClient()
      const [driversRes, usersRes, tripsRes] = await Promise.all([
        supabase.from('drivers').select('id, name').in('status', ['activo', 'disponible', 'en_viaje']).order('name'),
        supabase.from('app_users').select('id, name').eq('status', 'activo').order('name'),
        supabase.from('trips').select('id, origin_address, destination_address, vehicle_plates')
          .order('created_at', { ascending: false }).limit(100),
      ])

      setDrivers((driversRes.data ?? []) as DriverOption[])
      setUsers((usersRes.data ?? []) as UserOption[])
      setTrips(((tripsRes.data ?? []) as {
        id: string
        origin_address: string | null
        destination_address: string | null
        vehicle_plates: string | null
      }[]).map(t => ({
        id: t.id,
        label: `${t.vehicle_plates ?? '—'} · ${t.origin_address?.split(',')[0] ?? '—'} → ${t.destination_address?.split(',')[0] ?? '—'} (${t.id.slice(0, 6).toUpperCase()})`,
      })))
      setLoadingOpts(false)
    }
    void loadOpts()
  }, [])

  // Auto-seleccionar conductor/usuario según tipo
  useEffect(() => {
    if (type === 'pago_conductor' || type === 'bono' || type === 'penalizacion') {
      setUserId('')
    }
    if (type === 'cobro_usuario' || type === 'reembolso') {
      setDriverId('')
    }
  }, [type])

  // ── Validación ─────────────────────────────────────────────────────────────
  const isValid =
    concept.trim().length > 0 &&
    Number(amount) > 0 &&
    type.length > 0

  // ── Guardar ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!isValid) return
    setSaving(true)
    const supabase = createClient()

    const payload = {
      type,
      status,
      amount:    Number(amount),
      concept:   concept.trim(),
      notes:     notes.trim() || null,
      driver_id: driverId || null,
      user_id:   userId   || null,
      trip_id:   tripId   || null,
      paid_at:   status === 'pagado' ? new Date().toISOString() : null,
    }

    const { data, error } = await supabase
      .from('payments')
      .insert(payload)
      .select()
      .single()

    if (error) {
      showToast(`Error: ${error.message}`)
      setSaving(false)
      return
    }

    void log({
      action: 'create',
      entity: 'payment',
      entityId: data.id,
      detail: `Pago manual: ${concept.trim()} · $${Number(amount).toLocaleString('es-MX')}`,
    })

    showToast('✅ Pago registrado correctamente')
    router.push('/pagos')
  }

  const showDriver = ['pago_conductor', 'bono', 'penalizacion', 'ajuste'].includes(type)
  const showUser   = ['cobro_usuario', 'reembolso', 'ajuste'].includes(type)

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-icon" onClick={() => router.back()} title="Regresar">
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="page-title">Nuevo pago manual</h1>
            <p className="page-sub">Registrar un pago, cobro, reembolso o ajuste</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Tipo y estatus */}
        <div className="table-wrap" style={{ padding: '1.25rem' }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>Tipo de movimiento</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field-group">
              <label className="field-label">Tipo *</label>
              <select className="field-input" value={type} onChange={e => setType(e.target.value)}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Estatus inicial *</label>
              <select className="field-input" value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Monto y concepto */}
        <div className="table-wrap" style={{ padding: '1.25rem' }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>Detalle del pago</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field-group">
              <label className="field-label">Monto (MXN) *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }}>$</span>
                <input
                  className="field-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ paddingLeft: 24 }}
                />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Concepto *</label>
              <input
                className="field-input"
                type="text"
                placeholder="Ej. Pago semana 22, Reembolso viaje #ABC123…"
                value={concept}
                onChange={e => setConcept(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Notas internas</label>
              <textarea
                className="field-input"
                placeholder="Contexto adicional, motivo del ajuste, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>

        {/* Partes involucradas */}
        <div className="table-wrap" style={{ padding: '1.25rem' }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>Partes involucradas</p>
          {loadingOpts ? (
            <p className="muted" style={{ fontSize: 13 }}>Cargando opciones…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {showDriver && (
                <div className="field-group">
                  <label className="field-label">Conductor</label>
                  <select className="field-input" value={driverId} onChange={e => setDriverId(e.target.value)}>
                    <option value="">Sin conductor específico</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name ?? d.id}</option>)}
                  </select>
                </div>
              )}
              {showUser && (
                <div className="field-group">
                  <label className="field-label">Usuario</label>
                  <select className="field-input" value={userId} onChange={e => setUserId(e.target.value)}>
                    <option value="">Sin usuario específico</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name ?? u.id}</option>)}
                  </select>
                </div>
              )}
              <div className="field-group">
                <label className="field-label">Viaje relacionado</label>
                <select className="field-input" value={tripId} onChange={e => setTripId(e.target.value)}>
                  <option value="">Sin viaje relacionado</option>
                  {trips.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Resumen y acción */}
        {isValid && (
          <div style={{ padding: '12px 16px', background: 'var(--primary-dim)', borderRadius: 8, fontSize: 13 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Resumen</p>
            <p className="muted">
              {TYPE_OPTIONS.find(o => o.value === type)?.label} · <strong>${Number(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong> · {concept}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={handleSubmit}
            disabled={saving || !isValid}
            style={{ flex: 1, justifyContent: 'center', padding: '.75rem' }}>
            {saving ? 'Registrando…' : '✅ Registrar pago'}
          </button>
          <button className="btn-secondary" onClick={() => router.back()} disabled={saving}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}
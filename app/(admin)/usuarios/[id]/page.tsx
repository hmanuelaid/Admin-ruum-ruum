'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Chip } from '@/components/ui/Chip'
import { useAppStore } from '@/lib/store'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface UserDetail {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  type: string | null
  status: string | null
  trips_count: number | null
  company: string | null
  created_at: string | null
  notes: string | null
}

interface UserTrip {
  id: string
  status: string
  created_at: string | null
  client_price_mxn: number | null
  origin_address: string | null
  destination_address: string | null
  driver_name: string | null
}

// ── Catálogos ──────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  personal: 'Personal', empresarial: 'Empresarial', agencia: 'Agencia',
  lote: 'Lote', flotilla: 'Flotilla', arrendadora: 'Arrendadora',
  taller: 'Taller', aseguradora: 'Aseguradora',
}

const TRIP_STATUS_LABELS: Record<string, string> = {
  solicitud_recibida: 'Solicitud', pendiente_asignacion: 'Sin asignar',
  conductor_asignado: 'Asignado', traslado_curso: 'En tránsito',
  finalizado: 'Finalizado', cancelado: 'Cancelado', incidente: 'Incidente',
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function UsuarioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useAppStore()

  const [user,    setUser]    = useState<UserDetail | null>(null)
  const [trips,   setTrips]   = useState<UserTrip[]>([])
  const [tab,     setTab]     = useState<'viajes' | 'info'>('viajes')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [notes,   setNotes]   = useState('')
  const [editingNotes, setEditingNotes] = useState(false)

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      const [userRes, tripsRes] = await Promise.all([
        supabase
          .from('app_users')
          .select('id, name, email, phone, type, status, trips_count, company, created_at, notes')
          .eq('id', id)
          .single(),
        supabase
          .from('trips')
          .select('id, status, created_at, client_price_mxn, origin_address, destination_address, driver_name')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      if (userRes.error || !userRes.data) {
        showToast('No se pudo cargar el usuario')
        router.back()
        return
      }

      const u = userRes.data as UserDetail
      setUser(u)
      setNotes(u.notes ?? '')
      setTrips((tripsRes.data ?? []) as UserTrip[])
      setLoading(false)
    }

    void load()
  }, [id, router, showToast])

  // ── Suspender / activar ────────────────────────────────────────────────────
  async function handleToggleStatus() {
    if (!user) return
    const newStatus = user.status === 'activo' ? 'suspendido' : 'activo'
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('app_users')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setUser(prev => prev ? { ...prev, status: newStatus } : prev)
      showToast(newStatus === 'activo' ? '✅ Usuario activado' : '🚫 Usuario suspendido')
    }
    setSaving(false)
  }

  // ── Guardar notas internas ─────────────────────────────────────────────────
  async function handleSaveNotes() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('app_users')
      .update({ notes })
      .eq('id', id)

    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setUser(prev => prev ? { ...prev, notes } : prev)
      setEditingNotes(false)
      showToast('✅ Notas guardadas')
    }
    setSaving(false)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="empty-state" style={{ marginTop: '4rem' }}>
        <p className="muted">Cargando perfil del usuario…</p>
      </div>
    )
  }

  if (!user) return null

  const isActive     = user.status === 'activo'
  const totalGastado = trips
    .filter(t => t.status === 'finalizado')
    .reduce((sum, t) => sum + (t.client_price_mxn ?? 0), 0)
  const viajesFinalizados = trips.filter(t => t.status === 'finalizado').length
  const viajesCancelados  = trips.filter(t => t.status === 'cancelado').length

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
            <h1 className="page-title">{user.name ?? 'Sin nombre'}</h1>
            <p className="page-sub">
              {TYPE_LABELS[user.type ?? ''] ?? 'Usuario'} · {user.company ?? 'Sin empresa'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Chip status={isActive ? 'activo' : 'suspendido'}>
            {isActive ? 'Activo' : 'Suspendido'}
          </Chip>
          <button
            className={isActive ? 'btn-secondary' : 'btn-primary'}
            style={{ fontSize: 13 }}
            onClick={handleToggleStatus}
            disabled={saving}
          >
            {saving ? 'Guardando…' : isActive ? '🚫 Suspender' : '✅ Activar'}
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Viajes totales',     value: trips.length },
          { label: 'Finalizados',        value: viajesFinalizados },
          { label: 'Cancelados',         value: viajesCancelados },
          { label: 'Total gastado',      value: totalGastado ? `$${totalGastado.toLocaleString('es-MX')}` : '—' },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="icon" style={{ background: 'var(--primary-dim)', fontSize: 20 }}>—</div>
            <p className="value">{m.value}</p>
            <p className="label">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Info general + notas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '1.5rem' }}>
        {/* Datos de contacto */}
        <div className="table-wrap" style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Datos de contacto</p>
          {[
            ['Correo',    user.email    ?? '—'],
            ['Teléfono',  user.phone    ?? '—'],
            ['Tipo',      TYPE_LABELS[user.type ?? ''] ?? '—'],
            ['Empresa',   user.company  ?? '—'],
            ['Registro',  user.created_at ? new Date(user.created_at).toLocaleDateString('es-MX') : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
              <span className="muted">{label}</span>
              <span style={{ fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Notas internas */}
        <div className="table-wrap" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontWeight: 600, fontSize: 13 }}>Notas internas</p>
            {!editingNotes && (
              <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }}
                onClick={() => setEditingNotes(true)}>
                ✏️ Editar
              </button>
            )}
          </div>
          {editingNotes ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Agrega notas internas sobre este usuario…"
                rows={5}
                style={{ width: '100%', resize: 'vertical', fontSize: 13, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ fontSize: 12 }} onClick={handleSaveNotes} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setEditingNotes(false); setNotes(user.notes ?? '') }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: notes ? 'var(--text)' : 'var(--text-muted)', lineHeight: 1.6 }}>
              {notes || 'Sin notas registradas'}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
        {(['viajes', 'info'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 16px', fontSize: 13,
            fontWeight: tab === t ? 600 : 400,
            color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t === 'viajes' ? `Viajes (${trips.length})` : 'Actividad'}
          </button>
        ))}
      </div>

      {/* Tab: Viajes */}
      {tab === 'viajes' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Origen</th><th>Destino</th><th>Conductor</th>
                <th>Estatus</th><th>Costo</th><th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <p className="muted">Sin viajes registrados</p>
                  </div>
                </td></tr>
              ) : trips.map(trip => (
                <tr key={trip.id}>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {trip.origin_address ?? '—'}
                  </td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {trip.destination_address ?? '—'}
                  </td>
                  <td className="td-muted">{trip.driver_name ?? '—'}</td>
                  <td><Chip status={trip.status}>{TRIP_STATUS_LABELS[trip.status] ?? trip.status}</Chip></td>
                  <td className="td-bold">
                    {trip.client_price_mxn ? `$${Number(trip.client_price_mxn).toLocaleString('es-MX')}` : '—'}
                  </td>
                  <td className="td-muted">
                    {trip.created_at ? new Date(trip.created_at).toLocaleDateString('es-MX') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Actividad */}
      {tab === 'info' && (
        <div className="table-wrap" style={{ padding: '1.5rem' }}>
          <div className="empty-state">
            <p style={{ fontWeight: 600 }}>Actividad detallada</p>
            <p className="muted">Próximamente: log de acciones, sesiones y cambios de estatus</p>
          </div>
        </div>
      )}
    </>
  )
}

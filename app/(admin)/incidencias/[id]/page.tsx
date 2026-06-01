'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Chip } from '@/components/ui/Chip'
import { useAppStore } from '@/lib/store'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface IncidentDetail {
  id: string
  trip_id: string | null
  type: string | null
  status: string | null
  description: string | null
  assigned_to: string | null
  resolution: string | null
  created_at: string | null
  updated_at: string | null
}

interface AdminUser { id: string; name: string | null; email: string | null }
interface Note { id: string; content: string; author: string; created_at: string }

// ── Catálogos ──────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  dano_reportado: 'Daño reportado', retraso: 'Retraso',
  falta_evidencia: 'Falta evidencia', contacto_no_disponible: 'Contacto no disponible',
  problema_documentacion: 'Problema documentación', problema_pago: 'Problema pago',
  cancelacion: 'Cancelación', diferencia_kilometraje: 'Diferencia kilometraje',
  diferencia_combustible: 'Diferencia combustible', problema_conductor: 'Problema conductor',
  problema_usuario: 'Problema usuario', otro: 'Otro',
}

const STATUS_LABELS: Record<string, string> = {
  nueva: 'Nueva', en_revision: 'En revisión', requiere_informacion: 'Req. información',
  en_seguimiento: 'En seguimiento', resuelta: 'Resuelta',
  cerrada: 'Cerrada', escalada: 'Escalada',
}

const STATUS_FLOW: string[] = [
  'nueva', 'en_revision', 'requiere_informacion',
  'en_seguimiento', 'resuelta', 'cerrada', 'escalada',
]

// ── Componente ─────────────────────────────────────────────────────────────────
export default function IncidenciaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useAppStore()

  const [incident,     setIncident]     = useState<IncidentDetail | null>(null)
  const [adminUsers,   setAdminUsers]   = useState<AdminUser[]>([])
  const [notes,        setNotes]        = useState<Note[]>([])
  const [newNote,      setNewNote]      = useState('')
  const [resolution,   setResolution]   = useState('')
  const [editingRes,   setEditingRes]   = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [addingNote,   setAddingNote]   = useState(false)

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      const [incRes, adminsRes, notesRes] = await Promise.all([
        supabase.from('incidents').select('*').eq('id', id).single(),
        supabase.from('admin_users').select('id, name, email').eq('active', true).order('name'),
        // Las notas se guardan en una tabla incident_notes si existe,
        // si no existe simplemente quedará vacío sin romper nada
        supabase.from('incident_notes')
  .select('id, content, author, created_at')
  .eq('incident_id', id)
  .order('created_at', { ascending: true }),
      ])

      if (incRes.error || !incRes.data) {
        showToast('No se pudo cargar la incidencia')
        router.back()
        return
      }

      const inc = incRes.data as IncidentDetail
      setIncident(inc)
      setResolution(inc.resolution ?? '')
      setAdminUsers((adminsRes.data ?? []) as AdminUser[])
      setNotes((notesRes.data ?? []) as Note[])
      setLoading(false)
    }

    void load()
  }, [id, router, showToast])

  // ── Cambiar estatus ────────────────────────────────────────────────────────
  async function handleStatusChange(newStatus: string) {
    if (!incident) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('incidents')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setIncident(prev => prev ? { ...prev, status: newStatus } : prev)
      showToast(`Estatus → ${STATUS_LABELS[newStatus] ?? newStatus}`)
    }
    setSaving(false)
  }

  // ── Asignar responsable ────────────────────────────────────────────────────
  async function handleAssign(adminId: string) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('incidents')
      .update({ assigned_to: adminId || null, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setIncident(prev => prev ? { ...prev, assigned_to: adminId || null } : prev)
      const admin = adminUsers.find(a => a.id === adminId)
      showToast(admin ? `Asignado a ${admin.name ?? admin.email}` : 'Responsable eliminado')
    }
    setSaving(false)
  }

  // ── Guardar resolución ─────────────────────────────────────────────────────
  async function handleSaveResolution() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('incidents')
      .update({
        resolution,
        status: 'resuelta',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setIncident(prev => prev ? { ...prev, resolution, status: 'resuelta' } : prev)
      setEditingRes(false)
      showToast('✅ Resolución guardada — incidencia marcada como resuelta')
    }
    setSaving(false)
  }

  // ── Agregar nota de seguimiento ────────────────────────────────────────────
  async function handleAddNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    const supabase = createClient()

    // Obtener el admin logueado para el campo author
    const { data: { user } } = await supabase.auth.getUser()
    const adminName = adminUsers.find(a => a.id === user?.id)?.name ?? user?.email ?? 'Admin'

    const { data, error } = await supabase
      .from('incident_notes')
      .insert({ incident_id: id, content: newNote.trim(), author: adminName })
      .select()
      .single()

    if (error) {
      // Si la tabla no existe aún, mostrar aviso sin romper
      showToast('Tabla incident_notes pendiente de crear en Supabase')
    } else {
      setNotes(prev => [...prev, data as Note])
      setNewNote('')
      showToast('✅ Nota agregada')
    }
    setAddingNote(false)
  }

  // ── Escalar incidencia ─────────────────────────────────────────────────────
  async function handleEscalate() {
    await handleStatusChange('escalada')
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="empty-state" style={{ marginTop: '4rem' }}>
        <p className="muted">Cargando incidencia…</p>
      </div>
    )
  }

  if (!incident) return null

  const status = incident.status ?? ''
  const assignedAdmin = adminUsers.find(a => a.id === incident.assigned_to)
  const isResolved = status === 'resuelta' || status === 'cerrada'
  const shortId = incident.id.slice(0, 8).toUpperCase()

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
            <h1 className="page-title">Incidencia #{shortId}</h1>
            <p className="page-sub">
              {TYPE_LABELS[incident.type ?? ''] ?? 'Incidencia'} · {incident.created_at ? new Date(incident.created_at).toLocaleDateString('es-MX', { dateStyle: 'long' }) : '—'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isResolved && (
            <button className="btn-secondary" style={{ fontSize: 13, color: 'var(--danger)' }}
              onClick={handleEscalate} disabled={saving}>
              ⬆ Escalar
            </button>
          )}
          <select
            className="filter-select"
            value={status}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={saving}
          >
            {STATUS_FLOW.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <Chip status={status}>{STATUS_LABELS[status] ?? status}</Chip>
        </div>
      </div>

      {/* Grid principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '1.5rem' }}>

        {/* Datos de la incidencia */}
        <div className="table-wrap" style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Detalle</p>
          {[
            ['Tipo',       TYPE_LABELS[incident.type ?? ''] ?? '—'],
            ['Estatus',    STATUS_LABELS[status] ?? status],
            ['Viaje ID',   incident.trip_id ?? '—'],
            ['Creada',     incident.created_at ? new Date(incident.created_at).toLocaleString('es-MX') : '—'],
            ['Actualizada', incident.updated_at ? new Date(incident.updated_at).toLocaleString('es-MX') : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13, gap: 8 }}>
              <span className="muted" style={{ flexShrink: 0 }}>{label}</span>
              <span style={{ fontWeight: 500, textAlign: 'right', fontFamily: label === 'Viaje ID' ? 'var(--font-mono, monospace)' : 'inherit' }}>{value}</span>
            </div>
          ))}

          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Descripción</p>
            <p style={{ fontSize: 13, lineHeight: 1.6, background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 6 }}>
              {incident.description ?? 'Sin descripción'}
            </p>
          </div>
        </div>

        {/* Asignación y acciones */}
        <div className="table-wrap" style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Responsable</p>

          {assignedAdmin ? (
            <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 6 }}>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{assignedAdmin.name ?? assignedAdmin.email}</p>
              <p className="td-muted">{assignedAdmin.email}</p>
            </div>
          ) : (
            <p className="td-muted" style={{ marginBottom: 12, fontSize: 13 }}>Sin responsable asignado</p>
          )}

          <select
            className="filter-select"
            style={{ width: '100%', marginBottom: 16 }}
            value={incident.assigned_to ?? ''}
            onChange={e => handleAssign(e.target.value)}
            disabled={saving}
          >
            <option value="">Sin asignar</option>
            {adminUsers.map(a => (
              <option key={a.id} value={a.id}>{a.name ?? a.email}</option>
            ))}
          </select>

          {/* Acciones rápidas de estatus */}
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Acciones rápidas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {status === 'nueva' && (
              <button className="btn-primary" style={{ fontSize: 12, justifyContent: 'flex-start' }}
                onClick={() => handleStatusChange('en_revision')} disabled={saving}>
                🔍 Iniciar revisión
              </button>
            )}
            {(status === 'en_revision' || status === 'nueva') && (
              <button className="btn-secondary" style={{ fontSize: 12, justifyContent: 'flex-start' }}
                onClick={() => handleStatusChange('requiere_informacion')} disabled={saving}>
                ❓ Solicitar información
              </button>
            )}
            {status !== 'en_seguimiento' && !isResolved && (
              <button className="btn-secondary" style={{ fontSize: 12, justifyContent: 'flex-start' }}
                onClick={() => handleStatusChange('en_seguimiento')} disabled={saving}>
                👁 Poner en seguimiento
              </button>
            )}
            {!isResolved && (
              <button className="btn-secondary" style={{ fontSize: 12, justifyContent: 'flex-start' }}
                onClick={() => handleStatusChange('cerrada')} disabled={saving}>
                🔒 Cerrar sin resolver
              </button>
            )}
            {incident.trip_id && (
              <button className="btn-secondary" style={{ fontSize: 12, justifyContent: 'flex-start' }}
                onClick={() => router.push(`/viajes/${incident.trip_id}`)}>
                🚗 Ver viaje relacionado
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resolución */}
      <div className="table-wrap" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontWeight: 600, fontSize: 13 }}>Resolución</p>
          {!editingRes && !isResolved && (
            <button className="btn-primary" style={{ fontSize: 11, padding: '3px 10px' }}
              onClick={() => setEditingRes(true)}>
              ✓ Marcar como resuelta
            </button>
          )}
          {!editingRes && isResolved && incident.resolution && (
            <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }}
              onClick={() => setEditingRes(true)}>✏️ Editar</button>
          )}
        </div>

        {editingRes ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              placeholder="Describe cómo se resolvió la incidencia…"
              rows={4}
              style={{ width: '100%', resize: 'vertical', fontSize: 13, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" style={{ fontSize: 12 }}
                onClick={handleSaveResolution} disabled={saving || !resolution.trim()}>
                {saving ? 'Guardando…' : '✅ Guardar y resolver'}
              </button>
              <button className="btn-secondary" style={{ fontSize: 12 }}
                onClick={() => { setEditingRes(false); setResolution(incident.resolution ?? '') }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: incident.resolution ? 'var(--text)' : 'var(--text-muted)', lineHeight: 1.6 }}>
            {incident.resolution || 'Sin resolución registrada'}
          </p>
        )}
      </div>

      {/* Notas de seguimiento */}
      <div className="table-wrap" style={{ padding: '1rem 1.25rem' }}>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
          Notas de seguimiento {notes.length > 0 && `(${notes.length})`}
        </p>

        {/* Timeline de notas */}
        {notes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {notes.map(note => (
              <div key={note.id} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 6, borderLeft: '3px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{note.author}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(note.created_at).toLocaleString('es-MX')}
                  </span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5 }}>{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Agregar nota */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Agregar nota de seguimiento…"
            rows={3}
            style={{ width: '100%', resize: 'vertical', fontSize: 13, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'inherit' }}
          />
          <button
            className="btn-secondary"
            style={{ width: 'fit-content', fontSize: 12 }}
            onClick={handleAddNote}
            disabled={addingNote || !newNote.trim()}
          >
            {addingNote ? 'Agregando…' : '+ Agregar nota'}
          </button>
        </div>
      </div>
    </>
  )
}
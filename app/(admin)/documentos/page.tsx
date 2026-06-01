'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

type DocStatus = 'en_revision' | 'aprobado' | 'rechazado' | 'pendiente_carga' | 'vencido'

interface Document {
  id: string
  owner_id: string
  owner_type: 'user' | 'driver'
  owner_name: string
  type: string
  status: DocStatus
  url?: string
  notes?: string
  uploaded_at?: string
  updated_at?: string
}

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; bg: string }> = {
  pendiente_carga: { label: 'Pendiente',    color: 'var(--text-muted)', bg: 'var(--surface-2)'         },
  en_revision:     { label: 'En revisión',  color: 'var(--warning)',    bg: 'rgba(245,158,11,.12)'     },
  aprobado:        { label: 'Aprobado',     color: 'var(--success)',    bg: 'rgba(34,197,94,.12)'      },
  rechazado:       { label: 'Rechazado',    color: 'var(--danger)',     bg: 'rgba(239,68,68,.12)'      },
  vencido:         { label: 'Vencido',      color: 'var(--danger)',     bg: 'rgba(239,68,68,.08)'      },
}

const DOC_LABELS: Record<string, string> = {
  ine:           'INE / Pasaporte',
  licencia:      'Licencia de conducir',
  comprobante:   'Comprobante de domicilio',
  antecedentes:  'No antecedentes penales',
  foto_perfil:   'Foto de perfil',
  curp:          'CURP',
  rfc:           'RFC',
}

type FilterTab = 'todos' | 'en_revision' | 'aprobado' | 'rechazado'

async function postAdminOperation(path: string, payload: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo completar la operación')
  }

  return data
}

export default function DocumentosAdminPage() {
  const [docs, setDocs]             = useState<Document[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<FilterTab>('en_revision')
  const [selected, setSelected]     = useState<Document | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [search, setSearch]         = useState('')
  const { showToast } = useAppStore()

  // Carga inicial
  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) showToast(`No se pudieron cargar documentos: ${error.message}`)
        setDocs((data as Document[]) ?? [])
        setLoading(false)
      })

    // Realtime
    const channel = supabase
      .channel('admin-documents')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'documents',
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setDocs(prev => [payload.new as Document, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setDocs(prev => prev.map(d =>
            d.id === (payload.new as Document).id ? payload.new as Document : d
          ))
          setSelected(prev =>
            prev?.id === (payload.new as Document).id ? payload.new as Document : prev
          )
        } else if (payload.eventType === 'DELETE') {
          setDocs(prev => prev.filter(d => d.id !== (payload.old as Document).id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [showToast])

  // Aprobar
  async function handleApprove(doc: Document) {
    setProcessing(true)
    try {
      await postAdminOperation('/api/admin/documents/review', {
        documentId: doc.id,
        status: 'aprobado',
        expectedStatus: doc.status,
      })
      setDocs(prev => prev.map(item =>
        item.id === doc.id ? { ...item, status: 'aprobado', notes: undefined } : item
      ))
      showToast('Documento aprobado')
      setSelected(null)
      setRejectNotes('')
    } catch (error) {
      showToast(`No se pudo aprobar el documento: ${error instanceof Error ? error.message : 'operación fallida'}`)
    } finally {
      setProcessing(false)
    }
  }

  // Rechazar
  async function handleReject(doc: Document) {
    if (!rejectNotes.trim()) return
    setProcessing(true)
    const notes = rejectNotes.trim()
    try {
      await postAdminOperation('/api/admin/documents/review', {
        documentId: doc.id,
        status: 'rechazado',
        notes,
        expectedStatus: doc.status,
      })
      setDocs(prev => prev.map(item =>
        item.id === doc.id ? { ...item, status: 'rechazado', notes } : item
      ))
      showToast('Documento rechazado')
      setSelected(null)
      setRejectNotes('')
    } catch (error) {
      showToast(`No se pudo rechazar el documento: ${error instanceof Error ? error.message : 'operación fallida'}`)
    } finally {
      setProcessing(false)
    }
  }

  async function handleResetReview(doc: Document) {
    setProcessing(true)
    try {
      await postAdminOperation('/api/admin/documents/review', {
        documentId: doc.id,
        status: 'en_revision',
        expectedStatus: doc.status,
      })
      setDocs(prev => prev.map(item =>
        item.id === doc.id ? { ...item, status: 'en_revision', notes: undefined } : item
      ))
      setSelected(prev => prev ? { ...prev, status: 'en_revision', notes: undefined } : prev)
      showToast('Documento en revisión')
    } catch (error) {
      showToast(`No se pudo volver a poner en revisión: ${error instanceof Error ? error.message : 'operación fallida'}`)
    } finally {
      setProcessing(false)
    }
  }

  // Filtros
  const filtered = docs.filter(d => {
    const matchTab    = tab === 'todos' || d.status === tab
    const matchSearch = !search || d.owner_name.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const counts = {
    todos:       docs.length,
    en_revision: docs.filter(d => d.status === 'en_revision').length,
    aprobado:    docs.filter(d => d.status === 'aprobado').length,
    rechazado:   docs.filter(d => d.status === 'rechazado').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Documentos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Revisión y validación de documentos
          </p>
        </div>
        {counts.en_revision > 0 && (
          <span style={{
            background: 'rgba(245,158,11,.15)', color: 'var(--warning)',
            border: '1px solid rgba(245,158,11,.3)',
            borderRadius: 20, padding: '6px 14px',
            fontSize: 13, fontWeight: 600,
          }}>
            ⏳ {counts.en_revision} pendiente{counts.en_revision !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total',       value: counts.todos,       color: 'var(--text-muted)' },
          { label: 'En revisión', value: counts.en_revision, color: 'var(--warning)'    },
          { label: 'Aprobados',   value: counts.aprobado,    color: 'var(--success)'    },
          { label: 'Rechazados',  value: counts.rechazado,   color: 'var(--danger)'     },
        ].map(m => (
          <div key={m.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '14px 16px',
          }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros + búsqueda */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex', gap: 4, background: 'var(--surface-2)',
          borderRadius: 'var(--radius-sm)', padding: 4, flex: '0 0 auto',
        }}>
          {(['en_revision', 'todos', 'aprobado', 'rechazado'] as FilterTab[]).map(t => (
            <button key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none',
                background: tab === t ? 'var(--surface)' : 'none',
                color: tab === t ? 'var(--text)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: tab === t ? 600 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              {t === 'en_revision' ? 'En revisión' : t === 'todos' ? 'Todos' : t === 'aprobado' ? 'Aprobados' : 'Rechazados'}
              {counts[t] > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 11, fontWeight: 700,
                  color: t === 'en_revision' ? 'var(--warning)' : 'inherit',
                }}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        <input
          placeholder="Buscar por nombre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: '8px 12px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text)',
            fontSize: 14, outline: 'none',
          }}
        />
      </div>

      {/* Layout principal */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 16 }}>

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
              Cargando documentos…
            </p>
          ) : filtered.length === 0 ? (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '48px 24px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📄</p>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Sin documentos</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                {tab === 'en_revision' ? 'No hay documentos pendientes de revisión.' : 'No hay documentos en esta categoría.'}
              </p>
            </div>
          ) : (
            filtered.map(doc => {
              const cfg = STATUS_CONFIG[doc.status]
              const isSelected = selected?.id === doc.id
              return (
                <button key={doc.id}
                  onClick={() => { setSelected(isSelected ? null : doc); setRejectNotes('') }}
                  style={{
                    background: isSelected ? 'var(--primary-dim)' : 'var(--surface)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : doc.status === 'en_revision' ? 'rgba(245,158,11,.4)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', color: 'var(--text)', textAlign: 'left', width: '100%',
                    transition: 'border-color .15s',
                  }}>

                  {/* Tipo de owner */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: doc.owner_type === 'driver' ? 'rgba(108,99,255,.15)' : 'rgba(56,189,248,.15)',
                    display: 'grid', placeItems: 'center', fontSize: '1.2rem',
                  }}>
                    {doc.owner_type === 'driver' ? '🚗' : '👤'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{doc.owner_name}</p>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: doc.owner_type === 'driver' ? 'var(--primary)' : 'var(--accent)',
                        background: doc.owner_type === 'driver' ? 'var(--primary-dim)' : 'rgba(56,189,248,.12)',
                        padding: '1px 7px', borderRadius: 20,
                      }}>
                        {doc.owner_type === 'driver' ? 'Conductor' : 'Usuario'}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {DOC_LABELS[doc.type] ?? doc.type}
                    </p>
                    {doc.uploaded_at && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(doc.uploaded_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>

                  {/* Status chip */}
                  <span style={{
                    fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                    color: cfg.color, background: cfg.bg,
                    padding: '3px 10px', borderRadius: 20, flexShrink: 0,
                  }}>
                    {cfg.label}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* Panel de revisión */}
        {selected && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 20,
            display: 'flex', flexDirection: 'column', gap: 16,
            position: 'sticky', top: 20, alignSelf: 'start',
          }}>
            {/* Header del panel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Revisando documento
                </p>
                <p style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>
                  {DOC_LABELS[selected.type] ?? selected.type}
                </p>
              </div>
              <button onClick={() => { setSelected(null); setRejectNotes('') }}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: 'var(--surface-2)', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 16,
                }}>✕</button>
            </div>

            {/* Datos del owner */}
            <div style={{
              background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
              padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <span style={{ fontSize: '1.4rem' }}>
                {selected.owner_type === 'driver' ? '🚗' : '👤'}
              </span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{selected.owner_name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {selected.owner_type === 'driver' ? 'Conductor' : 'Usuario'} · ID: {selected.owner_id}
                </p>
              </div>
            </div>

            {/* Previsualización */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Documento
              </p>
              {selected.url ? (
                selected.url.endsWith('.pdf') ? (
                  <a href={selected.url} target="_blank" rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '14px',
                      textDecoration: 'none', color: 'var(--text)',
                    }}>
                    <span style={{ fontSize: '2rem' }}>📄</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>Documento PDF</p>
                      <p style={{ fontSize: 12, color: 'var(--primary)' }}>Abrir en nueva pestaña →</p>
                    </div>
                  </a>
                ) : (
                  <a href={selected.url} target="_blank" rel="noreferrer">
                    <img
                      src={selected.url}
                      alt={selected.type}
                      style={{
                        width: '100%', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        maxHeight: 220, objectFit: 'cover', cursor: 'zoom-in',
                      }}
                    />
                  </a>
                )
              ) : (
                <div style={{
                  background: 'var(--surface-2)', border: '1px dashed var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '24px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 24, marginBottom: 6 }}>📎</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin archivo adjunto</p>
                </div>
              )}
            </div>

            {/* Estado actual */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Estado actual</span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: STATUS_CONFIG[selected.status].color,
                background: STATUS_CONFIG[selected.status].bg,
                padding: '3px 12px', borderRadius: 20,
              }}>
                {STATUS_CONFIG[selected.status].label}
              </span>
            </div>

            {/* Notas previas de rechazo */}
            {selected.notes && selected.status === 'rechazado' && (
              <div style={{
                background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
                borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                fontSize: 13,
              }}>
                <p style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>Motivo de rechazo anterior</p>
                <p style={{ color: 'var(--text-muted)' }}>{selected.notes}</p>
              </div>
            )}

            {/* Acciones — solo si está en revisión */}
            {selected.status === 'en_revision' && (
              <>
                <div style={{ height: 1, background: 'var(--border)' }} />

                <button
                  onClick={() => handleApprove(selected)}
                  disabled={processing}
                  style={{
                    width: '100%', padding: '10px',
                    background: 'var(--success)', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    opacity: processing ? .6 : 1,
                  }}>
                  {processing ? 'Procesando…' : '✓ Aprobar documento'}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                    Motivo de rechazo (requerido para rechazar)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ej: La foto está borrosa, sube una imagen más clara…"
                    value={rejectNotes}
                    onChange={e => setRejectNotes(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', resize: 'none',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                      fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={() => handleReject(selected)}
                    disabled={processing || !rejectNotes.trim()}
                    style={{
                      width: '100%', padding: '10px',
                      background: 'rgba(239,68,68,.12)', color: 'var(--danger)',
                      border: '1px solid rgba(239,68,68,.3)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      opacity: (processing || !rejectNotes.trim()) ? .5 : 1,
                    }}>
                    ✕ Rechazar documento
                  </button>
                </div>
              </>
            )}

            {/* Ya revisado */}
            {selected.status !== 'en_revision' && (
              <div style={{
                background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
                padding: '12px 14px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Este documento ya fue revisado.
                </p>
                <button
                  onClick={() => handleResetReview(selected)}
                  disabled={processing}
                  style={{
                    marginTop: 8, background: 'none', border: 'none',
                    color: 'var(--primary)', fontSize: 13, cursor: 'pointer',
                  }}>
                  Volver a poner en revisión
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

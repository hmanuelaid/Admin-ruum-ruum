'use client'
import { useState, useRef } from 'react'
import { validateFile, getPreviewUrl, uploadDocument, ACCEPTED_TYPES, MAX_SIZE_MB } from '@/lib/storage'
import { createClient } from '@/lib/supabase'

export type DocStatus = 'pendiente_carga' | 'en_revision' | 'aprobado' | 'rechazado' | 'vencido'

export interface DocumentItem {
  id?: string
  docType: string
  label: string
  required: boolean
  status: DocStatus
  url?: string
  notes?: string
}

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; emoji: string }> = {
  pendiente_carga:  { label: 'Pendiente',    color: 'var(--text-muted)', emoji: '📎' },
  en_revision:      { label: 'En revisión',  color: 'var(--warning)',    emoji: '🔍' },
  aprobado:         { label: 'Aprobado',     color: 'var(--success)',    emoji: '✅' },
  rechazado:        { label: 'Rechazado',    color: 'var(--danger)',     emoji: '❌' },
  vencido:          { label: 'Vencido',      color: 'var(--danger)',     emoji: '⚠️' },
}

interface Props {
  doc: DocumentItem
  ownerId: string
  ownerType: 'user' | 'driver'
  ownerName: string
  onUploaded?: (doc: DocumentItem) => void
}

export function DocumentUploader({ doc, ownerId, ownerType, ownerName, onUploaded }: Props) {
  const [status, setStatus]       = useState<DocStatus>(doc.status)
  const [preview, setPreview]     = useState<string | null>(doc.url ?? null)
  const [fileType, setFileType]   = useState<string>('')
  const [error, setError]         = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef                  = useRef<HTMLInputElement>(null)
  const cfg                       = STATUS_CONFIG[status]

  async function handleFile(file: File) {
    setError(null)
    const err = validateFile(file)
    if (err) { setError(err); return }

    setPreview(getPreviewUrl(file))
    setFileType(file.type)
    setUploading(true)

    const result = await uploadDocument({
      file, ownerId, ownerType, docType: doc.docType,
    })

    if ('error' in result) {
      setError(result.error)
      setUploading(false)
      return
    }

    const supabase = createClient()
    const { data: existing, error: lookupError } = await supabase
      .from('documents')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('type', doc.docType)
      .maybeSingle()

    if (lookupError) {
      setError(`No se pudo consultar el documento: ${lookupError.message}`)
      setUploading(false)
      return
    }

    if (existing) {
      const { error: updateError } = await supabase.from('documents').update({
        status: 'en_revision',
        url: result.url,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)

      if (updateError) {
        setError(`El archivo subio, pero no se actualizo el registro: ${updateError.message}`)
        setUploading(false)
        return
      }
    } else {
      const { error: insertError } = await supabase.from('documents').insert({
        owner_id:   ownerId,
        owner_type: ownerType,
        owner_name: ownerName,
        type:       doc.docType,
        status:     'en_revision',
        url:        result.url,
        uploaded_at: new Date().toISOString(),
      })

      if (insertError) {
        setError(`El archivo subio, pero no se registro para revision: ${insertError.message}`)
        setUploading(false)
        return
      }
    }

    setStatus('en_revision')
    setUploading(false)
    onUploaded?.({ ...doc, status: 'en_revision', url: result.url })
  }

  return (
    <div style={{
      border: `1.5px solid ${status === 'aprobado' ? 'var(--success)' : status === 'rechazado' ? 'var(--danger)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      background: status === 'aprobado' ? 'rgba(34,197,94,.06)' : 'var(--surface)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{cfg.emoji}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontSize: 14 }}>{doc.label}</p>
          <p style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>{cfg.label}</p>
        </div>
        {!doc.required && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 20 }}>
            Opcional
          </span>
        )}
        {status !== 'aprobado' && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--primary-dim)', color: 'var(--primary)',
              border: '1px solid var(--primary)', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}>
            {uploading ? 'Subiendo…' : preview ? 'Cambiar' : 'Subir'}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {/* Preview */}
      {preview && (
        <div style={{ padding: '0 14px 12px' }}>
          {fileType === 'application/pdf' || (doc.url?.endsWith('.pdf')) ? (
            <div style={{
              background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
              padding: '12px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: '1.5rem' }}>📄</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600 }}>Documento PDF</p>
                <a href={preview} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: 'var(--primary)' }}>
                  Ver documento →
                </a>
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <img src={preview} alt={doc.label}
                style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
              {uploading && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,.5)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 13, color: '#fff', fontWeight: 600,
                }}>
                  Subiendo…
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notas de rechazo */}
      {status === 'rechazado' && doc.notes && (
        <div style={{
          margin: '0 14px 12px',
          padding: '10px 12px',
          background: 'rgba(239,68,68,.08)',
          border: '1px solid rgba(239,68,68,.2)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13, color: 'var(--danger)',
        }}>
          <strong>Motivo: </strong>{doc.notes}
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ padding: '0 14px 12px', fontSize: 12, color: 'var(--danger)' }}>
          ⚠️ {error}
        </p>
      )}

      {/* Info */}
      {!preview && status === 'pendiente_carga' && (
        <p style={{ padding: '0 14px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
          JPG, PNG, WEBP o PDF · Máx {MAX_SIZE_MB}MB
        </p>
      )}
    </div>
  )
}

// lib/useDocuments.ts
'use client'
import { useState, useEffect } from 'react'
import { createClient } from './supabase'
import type { DocStatus, DocumentItem } from '@/components/ui/DocumentUploader'

export function useDocuments(ownerId: string | null, docTypes: { docType: string; label: string; required: boolean }[]) {
  const [docs, setDocs]       = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ownerId) { setLoading(false); return }

    const supabase = createClient()
    supabase
      .from('documents')
      .select('*')
      .eq('owner_id', ownerId)
      .then(({ data }) => {
        const merged = docTypes.map(dt => {
          const found = data?.find(d => d.type === dt.docType)
          return {
            id:       found?.id,
            docType:  dt.docType,
            label:    dt.label,
            required: dt.required,
            status:   (found?.status ?? 'pendiente_carga') as DocStatus,
            url:      found?.url ?? undefined,
            notes:    found?.notes ?? undefined,
          }
        })
        setDocs(merged)
        setLoading(false)
      })

    // Realtime
    const channel = supabase
      .channel(`documents:${ownerId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'documents',
        filter: `owner_id=eq.${ownerId}`,
      }, payload => {
        setDocs(prev => prev.map(d => {
          const updated = payload.new as { type: string; status: DocStatus; url: string; notes: string }
          if (d.docType === updated.type) {
            return { ...d, status: updated.status, url: updated.url, notes: updated.notes }
          }
          return d
        }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ownerId])

  function updateDoc(updated: DocumentItem) {
    setDocs(prev => prev.map(d => d.docType === updated.docType ? updated : d))
  }

  return { docs, loading, updateDoc }
}
// lib/useDocuments.ts
'use client'
import { useState, useEffect } from 'react'
import { createClient } from './supabase'
import type { DocStatus, DocumentItem } from '@/components/ui/DocumentUploader'
import { getSignedStorageUrls, getStoragePath } from '@/lib/storage'

export function useDocuments(ownerId: string | null, docTypes: { docType: string; label: string; required: boolean }[]) {
  const [docs, setDocs]       = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(Boolean(ownerId))

  useEffect(() => {
    if (!ownerId) {
      queueMicrotask(() => {
        setDocs([])
        setLoading(false)
      })
      return
    }

    const supabase = createClient()
    supabase
      .from('documents')
      .select('id, type, status, url, storage_path, mime_type, notes')
      .eq('owner_id', ownerId)
      .then(async ({ data }) => {
        const merged: DocumentItem[] = docTypes.map(dt => {
          const found = data?.find(d => d.type === dt.docType)
          const storagePath = found?.storage_path ?? getStoragePath(found?.url, 'documents') ?? undefined
          return {
            id:       found?.id,
            docType:  dt.docType,
            label:    dt.label,
            required: dt.required,
            status:   (found?.status ?? 'pendiente_carga') as DocStatus,
            storagePath,
            mimeType: found?.mime_type ?? undefined,
            notes:    found?.notes ?? undefined,
          }
        })

        const paths = merged.flatMap(doc => doc.storagePath ? [doc.storagePath] : [])
        const urls = await getSignedStorageUrls('documents', paths)

        setDocs(merged.map(doc => ({
          ...doc,
          url: doc.storagePath ? urls[doc.storagePath] : undefined,
        })))
        setLoading(false)
      })

    // Realtime
    const channel = supabase
      .channel(`documents:${ownerId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'documents',
        filter: `owner_id=eq.${ownerId}`,
      }, async payload => {
        const updated = payload.new as { type: string; status: DocStatus; url: string | null; storage_path?: string | null; mime_type?: string | null; notes: string }
        const storagePath = updated.storage_path ?? getStoragePath(updated.url, 'documents') ?? undefined
        const urls = storagePath ? await getSignedStorageUrls('documents', [storagePath]) : {}

        setDocs(prev => prev.map(d => {
          if (d.docType === updated.type) {
            return {
              ...d,
              status: updated.status,
              storagePath,
              mimeType: updated.mime_type ?? undefined,
              url: storagePath ? urls[storagePath] : undefined,
              notes: updated.notes,
            }
          }
          return d
        }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [docTypes, ownerId])

  function updateDoc(updated: DocumentItem) {
    setDocs(prev => prev.map(d => d.docType === updated.docType ? updated : d))
  }

  return { docs, loading, updateDoc }
}

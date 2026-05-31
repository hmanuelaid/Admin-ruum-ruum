// lib/storage.ts
import { createClient } from './supabase'

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const MAX_SIZE_MB = 10
export const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `Tipo no permitido. Usa JPG, PNG, WEBP o PDF.`
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `El archivo supera ${MAX_SIZE_MB}MB.`
  }
  return null
}

export function getPreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

export async function uploadDocument(params: {
  file: File
  ownerId: string
  ownerType: 'user' | 'driver'
  docType: string
}): Promise<{ url: string; path: string } | { error: string }> {
  const { file, ownerId, ownerType, docType } = params
  const supabase = createClient()

  const ext  = file.name.split('.').pop()
  const path = `${ownerType}/${ownerId}/${docType}_${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('documents')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) return { error: error.message }

  const { data } = supabase.storage.from('documents').getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function uploadEvidence(params: {
  file: File
  tripId: string
  type: 'inicial' | 'final' | 'durante'
  index: number
}): Promise<{ url: string; path: string } | { error: string }> {
  const { file, tripId, type, index } = params
  const supabase = createClient()

  const ext  = file.name.split('.').pop()
  const path = `${tripId}/${type}_${index}_${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('evidence')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) return { error: error.message }

  const { data } = supabase.storage.from('evidence').getPublicUrl(path)
  return { url: data.publicUrl, path }
}
export const ACCEPTED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export const ACCEPTED_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const
export const ACCEPTED_TYPES = [...ACCEPTED_DOCUMENT_TYPES]
export const MAX_SIZE_MB = 10
export const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export function validateFile(file: File, acceptedTypes: readonly string[] = ACCEPTED_DOCUMENT_TYPES): string | null {
  if (!acceptedTypes.includes(file.type)) {
    return acceptedTypes.includes('application/pdf')
      ? 'Tipo no permitido. Usa JPG, PNG, WEBP o PDF.'
      : 'Tipo no permitido. Usa JPG, PNG, WEBP, HEIC o HEIF.'
  }

  if (file.size > MAX_SIZE_BYTES) {
    return `El archivo supera ${MAX_SIZE_MB}MB.`
  }

  return null
}

export function getPreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

export function getStoragePath(value: string | null | undefined, bucket: 'documents' | 'evidence'): string | null {
  if (!value) return null

  if (!/^https?:\/\//i.test(value)) {
    return value.replace(/^\/+/, '')
  }

  const publicMarker = `/storage/v1/object/public/${bucket}/`
  const signedMarker = `/storage/v1/object/sign/${bucket}/`
  const marker = value.includes(publicMarker) ? publicMarker : value.includes(signedMarker) ? signedMarker : null

  if (!marker) return null

  return decodeURIComponent(value.split(marker)[1]?.split('?')[0] ?? '').replace(/^\/+/, '') || null
}

export function isPdfPath(value: string | null | undefined) {
  return Boolean(value?.toLowerCase().split('?')[0]?.endsWith('.pdf'))
}

async function postForm(path: string, formData: FormData) {
  const response = await fetch(path, {
    method: 'POST',
    body: formData,
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return { error: typeof data.error === 'string' ? data.error : 'No se pudo subir el archivo' }
  }

  return data
}

export async function uploadDocument(params: {
  file: File
  ownerId: string
  ownerType: 'user' | 'driver'
  ownerName: string
  docType: string
}): Promise<{ signedUrl: string | null; path: string; documentId: string | null; mimeType: string } | { error: string }> {
  const formData = new FormData()
  formData.set('file', params.file)
  formData.set('ownerId', params.ownerId)
  formData.set('ownerType', params.ownerType)
  formData.set('ownerName', params.ownerName)
  formData.set('docType', params.docType)

  return postForm('/api/admin/storage/documents', formData)
}

export async function uploadEvidence(params: {
  file: File
  tripId: string
  type: 'inicial' | 'final' | 'durante'
  index: number
}): Promise<{ signedUrl: string | null; path: string; mimeType: string } | { error: string }> {
  const formData = new FormData()
  formData.set('file', params.file)
  formData.set('tripId', params.tripId)
  formData.set('type', params.type)
  formData.set('index', String(params.index))

  return postForm('/api/admin/storage/evidence', formData)
}

export async function getSignedStorageUrls(
  bucket: 'documents' | 'evidence',
  paths: string[]
): Promise<Record<string, string>> {
  const uniquePaths = Array.from(new Set(paths.flatMap(path => {
    const storagePath = getStoragePath(path, bucket)
    return storagePath ? [storagePath] : []
  })))

  if (uniquePaths.length === 0) return {}

  const response = await fetch('/api/admin/storage/signed-urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, paths: uniquePaths }),
  })

  if (!response.ok) return {}

  const data = await response.json().catch(() => ({}))
  return typeof data.urls === 'object' && data.urls ? data.urls as Record<string, string> : {}
}

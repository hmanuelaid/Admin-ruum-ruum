import { MAX_SIZE_BYTES, MAX_SIZE_MB } from '@/lib/storage'

export type DetectedFile = {
  mimeType: string
  extension: string
  bytes: Uint8Array
}

const DOCUMENT_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const EVIDENCE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value)
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end))
}

function detectMime(bytes: Uint8Array): { mimeType: string; extension: string } | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { mimeType: 'image/jpeg', extension: 'jpg' }
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: 'png' }
  }

  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return { mimeType: 'image/webp', extension: 'webp' }
  }

  if (ascii(bytes, 0, 4) === '%PDF') {
    return { mimeType: 'application/pdf', extension: 'pdf' }
  }

  if (ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12).toLowerCase()
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) {
      return { mimeType: 'image/heic', extension: 'heic' }
    }
    if (['heif', 'heis', 'mif1', 'msf1'].includes(brand)) {
      return { mimeType: 'image/heif', extension: 'heif' }
    }
  }

  return null
}

export async function validateUploadedFile(file: File, kind: 'document' | 'evidence'): Promise<DetectedFile | { error: string }> {
  if (file.size <= 0) {
    return { error: 'El archivo está vacío.' }
  }

  if (file.size > MAX_SIZE_BYTES) {
    return { error: `El archivo supera ${MAX_SIZE_MB}MB.` }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const detected = detectMime(bytes)

  if (!detected) {
    return { error: 'No se pudo validar el tipo real del archivo.' }
  }

  const allowed = kind === 'document' ? DOCUMENT_MIME : EVIDENCE_MIME
  if (!allowed.has(detected.mimeType)) {
    return { error: kind === 'document' ? 'Usa JPG, PNG, WEBP o PDF.' : 'Usa JPG, PNG, WEBP, HEIC o HEIF.' }
  }

  if (file.type && file.type !== detected.mimeType) {
    return { error: `El MIME declarado (${file.type}) no coincide con el contenido real (${detected.mimeType}).` }
  }

  return { ...detected, bytes }
}

export function isSafeStoragePath(path: string) {
  return path.length > 0 &&
    path.length <= 512 &&
    !path.startsWith('/') &&
    !path.includes('..') &&
    !path.includes('\\') &&
    !/[\x00-\x1f\x7f]/.test(path)
}

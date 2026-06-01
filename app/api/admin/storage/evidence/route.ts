import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { isSafeStoragePath, validateUploadedFile } from '@/lib/api/storage-validation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const EVIDENCE_TYPES = new Set(['inicial', 'final', 'durante'])

export async function POST(request: Request) {
  const { response } = await authorizeAdminAction('storage.read_evidence')
  if (response) return response

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })

  const file = formData.get('file')
  const tripId = formData.get('tripId')
  const type = formData.get('type')
  const index = formData.get('index')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  if (typeof tripId !== 'string' || tripId.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid trip id' }, { status: 400 })
  }

  if (typeof type !== 'string' || !EVIDENCE_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid evidence type' }, { status: 400 })
  }

  const safeIndex = typeof index === 'string' && /^\d{1,3}$/.test(index) ? index : '0'
  const validated = await validateUploadedFile(file, 'evidence')
  if ('error' in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const path = `${tripId.trim()}/${type}/${safeIndex}_${crypto.randomUUID()}.${validated.extension}`
  if (!isSafeStoragePath(path)) {
    return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.storage
    .from('evidence')
    .upload(path, validated.bytes, {
      contentType: validated.mimeType,
      upsert: false,
    })

  if (error) return rpcErrorResponse(error.message)

  const { data: signed } = await supabase.storage.from('evidence').createSignedUrl(path, 300)

  return NextResponse.json({
    path,
    signedUrl: signed?.signedUrl ?? null,
    mimeType: validated.mimeType,
  })
}

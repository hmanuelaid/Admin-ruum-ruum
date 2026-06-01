import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { isSafeStoragePath, validateUploadedFile } from '@/lib/api/storage-validation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DOC_TYPE_RE = /^[a-z0-9_-]{1,64}$/i

export async function POST(request: Request) {
  const { response } = await authorizeAdminAction('documents.upload')
  if (response) return response

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })

  const file = formData.get('file')
  const ownerId = formData.get('ownerId')
  const ownerType = formData.get('ownerType')
  const ownerName = formData.get('ownerName')
  const docType = formData.get('docType')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  if (typeof ownerId !== 'string' || !UUID_RE.test(ownerId)) {
    return NextResponse.json({ error: 'Invalid owner id' }, { status: 400 })
  }

  if (ownerType !== 'user' && ownerType !== 'driver') {
    return NextResponse.json({ error: 'Invalid owner type' }, { status: 400 })
  }

  if (typeof ownerName !== 'string' || ownerName.trim().length === 0) {
    return NextResponse.json({ error: 'Owner name is required' }, { status: 400 })
  }

  if (typeof docType !== 'string' || !DOC_TYPE_RE.test(docType)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
  }

  const validated = await validateUploadedFile(file, 'document')
  if ('error' in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const path = `${ownerType}/${ownerId}/${docType}/${crypto.randomUUID()}.${validated.extension}`
  if (!isSafeStoragePath(path)) {
    return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data: existing, error: lookupError } = await supabase
    .from('documents')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('owner_type', ownerType)
    .eq('type', docType)
    .maybeSingle()

  if (lookupError) return rpcErrorResponse(lookupError.message)

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, validated.bytes, {
      contentType: validated.mimeType,
      upsert: false,
    })

  if (uploadError) return rpcErrorResponse(uploadError.message)

  const now = new Date().toISOString()
  const payload = {
    owner_id: ownerId,
    owner_type: ownerType,
    owner_name: ownerName.trim().slice(0, 160),
    type: docType,
    status: 'en_revision',
    url: path,
    storage_path: path,
    mime_type: validated.mimeType,
    file_size_bytes: file.size,
    notes: null,
    uploaded_at: now,
    updated_at: now,
    reviewed_by: null,
  }

  const documentResult = existing
    ? await supabase.from('documents').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('documents').insert(payload).select('id').single()

  if (documentResult.error) {
    await supabase.storage.from('documents').remove([path])
    return rpcErrorResponse(documentResult.error.message)
  }

  const { data: signed } = await supabase.storage.from('documents').createSignedUrl(path, 300)

  return NextResponse.json({
    path,
    signedUrl: signed?.signedUrl ?? null,
    documentId: documentResult.data?.id ?? null,
    mimeType: validated.mimeType,
  })
}

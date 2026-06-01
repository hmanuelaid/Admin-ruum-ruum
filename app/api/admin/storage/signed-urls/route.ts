import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { isSafeStoragePath } from '@/lib/api/storage-validation'
import { getStoragePath } from '@/lib/storage'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type SignedUrlsBody = {
  bucket?: unknown
  paths?: unknown
}

export async function POST(request: Request) {
  let body: SignedUrlsBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.bucket !== 'documents' && body.bucket !== 'evidence') {
    return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
  }

  const { response } = await authorizeAdminAction(body.bucket === 'documents' ? 'storage.read_documents' : 'storage.read_evidence')
  if (response) return response

  if (!Array.isArray(body.paths) || body.paths.length === 0 || body.paths.length > 100) {
    return NextResponse.json({ error: 'Invalid paths' }, { status: 400 })
  }

  const paths = Array.from(new Set(body.paths.flatMap(path => {
    if (typeof path !== 'string') return []
    const storagePath = getStoragePath(path, body.bucket as 'documents' | 'evidence')
    return storagePath && isSafeStoragePath(storagePath) ? [storagePath] : []
  })))

  if (paths.length === 0) {
    return NextResponse.json({ urls: {} })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.storage.from(body.bucket).createSignedUrls(paths, 300)

  if (error) return rpcErrorResponse(error.message)

  const urls = Object.fromEntries(
    (data ?? []).flatMap((item, index) => item.signedUrl ? [[paths[index], item.signedUrl]] : [])
  )

  return NextResponse.json({ urls })
}

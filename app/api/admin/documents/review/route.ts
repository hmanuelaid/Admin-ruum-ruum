import { NextResponse } from 'next/server'
import { authorizeAdminAction, rpcErrorResponse } from '@/lib/api/admin-actions'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DOC_STATUSES = new Set(['aprobado', 'rechazado', 'en_revision'])

type ReviewDocumentBody = {
  documentId?: unknown
  status?: unknown
  notes?: unknown
  expectedStatus?: unknown
}

export async function POST(request: Request) {
  const { response } = await authorizeAdminAction('documents.review')
  if (response) return response

  let body: ReviewDocumentBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.documentId !== 'string' || !UUID_RE.test(body.documentId)) {
    return NextResponse.json({ error: 'Invalid document id' }, { status: 400 })
  }

  if (typeof body.status !== 'string' || !DOC_STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'Invalid document status' }, { status: 400 })
  }

  if (body.expectedStatus != null && (typeof body.expectedStatus !== 'string' || !DOC_STATUSES.has(body.expectedStatus))) {
    return NextResponse.json({ error: 'Invalid expected status' }, { status: 400 })
  }

  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null
  if (body.status === 'rechazado' && !notes) {
    return NextResponse.json({ error: 'Reject notes are required' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('review_document_atomic', {
    p_document_id: body.documentId,
    p_status: body.status,
    p_notes: notes,
    p_expected_status: body.expectedStatus ?? null,
  })

  if (error) return rpcErrorResponse(error.message)

  return NextResponse.json({ ok: true, data })
}

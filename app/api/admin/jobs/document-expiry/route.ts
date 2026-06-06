import { NextResponse } from 'next/server'
import { mergeConfigRows, type SystemConfigRow } from '@/lib/config/system-config'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

type ExpireResult = {
  expired_documents?: number
  drivers_marked?: number
}

type ExpiringDocument = {
  document_id: string
  driver_id: string
  doc_type: string
  expires_at: string
  days_until_expiry: number
}

type AdminRecipient = {
  id: string
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function runDocumentExpiryJob(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseServiceClient()

  const { data: expireData, error: expireError } = await supabase.rpc('expire_overdue_documents')

  if (expireError) {
    console.error('[job/document-expiry] expire error:', expireError.message)
    return NextResponse.json({ error: expireError.message }, { status: 500 })
  }

  const expireResult = (expireData ?? {}) as ExpireResult
  const expiredDocuments = expireResult.expired_documents ?? 0
  const driversMarked = expireResult.drivers_marked ?? 0

  const { data: configRows, error: configError } = await supabase
    .from('system_config')
    .select('id, key, value')

  if (configError) {
    console.error('[job/document-expiry] config error:', configError.message)
    return NextResponse.json({ error: configError.message }, { status: 500 })
  }

  const config = mergeConfigRows((configRows ?? []) as SystemConfigRow[])
  const toggleItem = config.find(item => item.key === 'notif_doc_vencido')

  if (toggleItem?.value !== 'true') {
    return NextResponse.json({
      ok: true,
      expired_documents: expiredDocuments,
      drivers_marked: driversMarked,
      checked: 0,
      alerted: 0,
      skipped: 'toggle_off',
    })
  }

  const { data: expiringRows, error: expiringError } = await supabase
    .rpc('get_expiring_driver_documents', { p_days: 30 })

  if (expiringError) {
    console.error('[job/document-expiry] expiring documents error:', expiringError.message)
    return NextResponse.json({ error: expiringError.message }, { status: 500 })
  }

  const expiringDocuments = (expiringRows ?? []) as ExpiringDocument[]

  if (expiringDocuments.length === 0) {
    return NextResponse.json({
      ok: true,
      expired_documents: expiredDocuments,
      drivers_marked: driversMarked,
      checked: 0,
      alerted: 0,
      skipped: 0,
    })
  }

  const { data: adminRows, error: adminsError } = await supabase
    .from('admin_users')
    .select('id')
    .in('role', ['super_admin', 'admin_operativo'])
    .eq('active', true)

  if (adminsError) {
    console.error('[job/document-expiry] admins error:', adminsError.message)
    return NextResponse.json({ error: adminsError.message }, { status: 500 })
  }

  const admins = (adminRows ?? []) as AdminRecipient[]
  const driverNotifications = expiringDocuments.map(document => ({
    user_id: document.driver_id,
    user_type: 'driver',
    type: 'documento_por_vencer',
    title: 'Documento por vencer',
    body: `Tu ${document.doc_type} vence en ${document.days_until_expiry} dia(s).`,
    metadata: {
      document_id: document.document_id,
      doc_type: document.doc_type,
      expires_at: document.expires_at,
      days_until_expiry: document.days_until_expiry,
    },
  }))

  const adminNotifications = expiringDocuments.flatMap(document =>
    admins.map(admin => ({
      user_id: admin.id,
      user_type: 'admin',
      type: 'documento_por_vencer',
      title: 'Documento de conductor por vencer',
      body: `El documento ${document.doc_type} vence en ${document.days_until_expiry} dia(s).`,
      metadata: {
        document_id: document.document_id,
        driver_id: document.driver_id,
        doc_type: document.doc_type,
        expires_at: document.expires_at,
        days_until_expiry: document.days_until_expiry,
      },
    }))
  )

  const notifications = [...driverNotifications, ...adminNotifications]
  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications)

  if (insertError) {
    console.error('[job/document-expiry] insert error:', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { error: logError } = await supabase.rpc('log_admin_activity', {
    p_action: 'create',
    p_entity: 'document',
    p_entity_id: null,
    p_detail: `Job: ${expiredDocuments} documento(s) vencidos, ${expiringDocuments.length} por vencer`,
  })

  if (logError) {
    console.error('[job/document-expiry] activity log error:', logError.message)
  }

  return NextResponse.json({
    ok: true,
    expired_documents: expiredDocuments,
    drivers_marked: driversMarked,
    checked: expiringDocuments.length,
    alerted: expiringDocuments.length,
    skipped: 0,
    admins_notified: admins.length,
    notifications_created: notifications.length,
  })
}

export async function GET(req: Request) {
  return runDocumentExpiryJob(req)
}

export async function POST(req: Request) {
  return runDocumentExpiryJob(req)
}

import { NextResponse } from 'next/server'
import { mergeConfigRows, type SystemConfigRow } from '@/lib/config/system-config'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

type UnassignedTrip = {
  trip_id: string
  created_at: string
  minutes_waiting: number
}

type AdminRecipient = {
  id: string
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  return req.headers.get('authorization') === `Bearer ${secret}`
}

function getPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function runUnassignedTripsJob(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseServiceClient()

  const { data: configRows, error: configError } = await supabase
    .from('system_config')
    .select('id, key, value')

  if (configError) {
    console.error('[job/unassigned-trips] config error:', configError.message)
    return NextResponse.json({ error: configError.message }, { status: 500 })
  }

  const config = mergeConfigRows((configRows ?? []) as SystemConfigRow[])
  const toggleItem = config.find(item => item.key === 'notif_viaje_sin_conductor')
  const minutesItem = config.find(item => item.key === 'tiempo_asignacion_min')

  if (toggleItem?.value !== 'true') {
    return NextResponse.json({ ok: true, checked: 0, alerted: 0, skipped: 'toggle_off' })
  }

  const minutes = getPositiveInteger(minutesItem?.value, 15)
  const { data: unassignedRows, error: rpcError } = await supabase
    .rpc('check_unassigned_trips', { p_minutes: minutes })

  if (rpcError) {
    console.error('[job/unassigned-trips] RPC error:', rpcError.message)
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  const unassigned = (unassignedRows ?? []) as UnassignedTrip[]

  if (unassigned.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, alerted: 0, skipped: 0 })
  }

  const { data: adminRows, error: adminsError } = await supabase
    .from('admin_users')
    .select('id')
    .in('role', ['super_admin', 'admin_operativo'])
    .eq('active', true)

  if (adminsError) {
    console.error('[job/unassigned-trips] admins error:', adminsError.message)
    return NextResponse.json({ error: adminsError.message }, { status: 500 })
  }

  const admins = (adminRows ?? []) as AdminRecipient[]

  if (admins.length === 0) {
    return NextResponse.json({
      ok: true,
      checked: unassigned.length,
      alerted: 0,
      skipped: unassigned.length,
      reason: 'no_admins',
    })
  }

  const notifications = unassigned.flatMap(trip =>
    admins.map(admin => ({
      user_id: admin.id,
      user_type: 'admin',
      type: 'viaje_sin_conductor',
      title: 'Viaje sin conductor asignado',
      body: `El viaje lleva ${trip.minutes_waiting} min esperando conductor.`,
      metadata: {
        trip_id: trip.trip_id,
        minutes_waiting: trip.minutes_waiting,
        created_at: trip.created_at,
      },
    }))
  )

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications)

  if (insertError) {
    console.error('[job/unassigned-trips] insert error:', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { error: logError } = await supabase.rpc('log_admin_activity', {
    p_action: 'create',
    p_entity: 'trip',
    p_entity_id: null,
    p_detail: `Job: ${unassigned.length} viaje(s) sin conductor despues de ${minutes} min`,
  })

  if (logError) {
    console.error('[job/unassigned-trips] activity log error:', logError.message)
  }

  return NextResponse.json({
    ok: true,
    checked: unassigned.length,
    alerted: unassigned.length,
    skipped: 0,
    admins_notified: admins.length,
    notifications_created: notifications.length,
  })
}

export async function GET(req: Request) {
  return runUnassignedTripsJob(req)
}

export async function POST(req: Request) {
  return runUnassignedTripsJob(req)
}

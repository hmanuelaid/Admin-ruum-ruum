'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import type { TripStatus } from '@/lib/types'

type Tab = 'Todos' | 'Pendientes' | 'En curso' | 'Finalizados' | 'Cancelados' | 'Incidencias'
type Relation<T> = T | T[] | null

const STATUS_LABELS: Record<string, string> = {
  solicitud_recibida: 'Solicitud recibida', pendiente_revision: 'En revisión',
  pendiente_asignacion: 'Sin conductor', conductor_asignado: 'Conductor asignado',
  conductor_en_camino: 'En camino', recoleccion_proceso: 'Recolección',
  evidencia_inicial_pendiente: 'Ev. inicial', traslado_curso: 'En curso',
  entrega_proceso: 'Entrega', evidencia_final_pendiente: 'Ev. final',
  finalizado: 'Finalizado', cancelado: 'Cancelado', incidente: 'Incidente',
}

const PENDING = ['solicitud_recibida','pendiente_revision','pendiente_asignacion']
const ACTIVE  = ['conductor_asignado','conductor_en_camino','recoleccion_proceso',
  'evidencia_inicial_pendiente','traslado_curso','entrega_proceso','evidencia_final_pendiente']

interface TripUser {
  name: string | null
  email: string | null
  type: string | null
}

interface TripDriver {
  name: string | null
  email: string | null
  status: string | null
}

interface AdminTrip {
  id: string
  status: TripStatus | string | null
  driver_id: string | null
  vehicle_brand: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_plates: string | null
  origin_address: string | null
  destination_address: string | null
  distance_km: number | null
  client_price_mxn: number | null
  driver_pay_mxn: number | null
  service_type: string | null
  scheduled_at: string | null
  created_at: string | null
  updated_at: string | null
  app_users: Relation<TripUser>
  drivers: Relation<TripDriver>
}

interface DriverOption {
  id: string
  name: string | null
  status: string | null
}

function one<T>(value: Relation<T> | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function money(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString('es-MX')}`
}

export default function ViajesPage() {
  const [tab, setTab] = useState<Tab>('Todos')
  const [search, setSearch] = useState('')
  const [trips, setTrips] = useState<AdminTrip[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assigning, setAssigning] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const { showToast } = useAppStore()

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError('')

    const supabase = createClient()
    const [tripsResult, driversResult] = await Promise.all([
      supabase
        .from('trips')
        .select(`
          id,
          status,
          driver_id,
          vehicle_brand,
          vehicle_model,
          vehicle_year,
          vehicle_plates,
          origin_address,
          destination_address,
          distance_km,
          client_price_mxn,
          driver_pay_mxn,
          service_type,
          scheduled_at,
          created_at,
          updated_at,
          app_users(name, email, type),
          drivers(name, email, status)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('drivers')
        .select('id, name, status')
        .in('status', ['disponible', 'activo'])
        .order('name', { ascending: true }),
    ])

    if (tripsResult.error) {
      setError(tripsResult.error.message)
      setTrips([])
      showToast(`No se pudieron cargar viajes: ${tripsResult.error.message}`)
    } else {
      setTrips((tripsResult.data ?? []) as unknown as AdminTrip[])
    }

    if (driversResult.error) {
      setDrivers([])
      showToast(`No se pudieron cargar conductores: ${driversResult.error.message}`)
    } else {
      setDrivers((driversResult.data ?? []) as DriverOption[])
    }

    if (showLoading) setLoading(false)
  }, [showToast])

  useEffect(() => {
    const supabase = createClient()

    queueMicrotask(() => {
      void loadData()
    })

    const channel = supabase
      .channel('admin-trips')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'trips',
      }, () => {
        void loadData(false)
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'drivers',
      }, () => {
        void loadData(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadData])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return trips.filter(trip => {
      const user = one(trip.app_users)
      const driver = one(trip.drivers)
      const status = trip.status ?? ''

      const matchTab =
        tab === 'Todos' ||
        (tab === 'Pendientes' && PENDING.includes(status)) ||
        (tab === 'En curso' && ACTIVE.includes(status)) ||
        (tab === 'Finalizados' && status === 'finalizado') ||
        (tab === 'Cancelados' && status === 'cancelado') ||
        (tab === 'Incidencias' && status === 'incidente')

      const matchSearch =
        !query ||
        trip.id.toLowerCase().includes(query) ||
        (user?.name ?? '').toLowerCase().includes(query) ||
        (user?.email ?? '').toLowerCase().includes(query) ||
        (driver?.name ?? '').toLowerCase().includes(query) ||
        (trip.vehicle_plates ?? '').toLowerCase().includes(query) ||
        (trip.origin_address ?? '').toLowerCase().includes(query) ||
        (trip.destination_address ?? '').toLowerCase().includes(query)

      return matchTab && matchSearch
    })
  }, [search, tab, trips])

  async function assignDriver(tripId: string, driverId: string) {
    setAssigning(tripId)
    const now = new Date().toISOString()
    const supabase = createClient()
    const { error: tripError } = await supabase
      .from('trips')
      .update({ driver_id: driverId, status: 'conductor_asignado', updated_at: now })
      .eq('id', tripId)

    if (tripError) {
      showToast(`Error al asignar conductor: ${tripError.message}`)
      setAssigning(null)
      return
    }

    const { error: driverError } = await supabase
      .from('drivers')
      .update({ status: 'en_viaje', updated_at: now })
      .eq('id', driverId)

    if (driverError) {
      showToast(`Conductor asignado, pero no se actualizó su estatus: ${driverError.message}`)
    } else {
      showToast('Conductor asignado')
    }

    setAssigning(null)
    void loadData(false)
  }

  async function changeStatus(tripId: string, status: string) {
    setUpdating(tripId)
    const now = new Date().toISOString()
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('trips')
      .update({ status, updated_at: now })
      .eq('id', tripId)

    if (updateError) {
      showToast(`No se pudo actualizar estatus: ${updateError.message}`)
    } else {
      setTrips(prev => prev.map(trip =>
        trip.id === tripId ? { ...trip, status, updated_at: now } : trip
      ))
      showToast('Estatus actualizado')
    }

    setUpdating(null)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Viajes</h1>
          <p className="page-sub">
            {loading ? 'Cargando viajes…' : `${filtered.length} traslados`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Crear viaje — próximamente')}>
          + Nuevo viaje
        </button>
      </div>

      <div className="tabs">
        {(['Todos','Pendientes','En curso','Finalizados','Cancelados','Incidencias'] as Tab[]).map(item => (
          <button key={item} className={`tab${tab === item ? ' active' : ''}`} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>

      <div className="filters-bar">
        <div className="filter-search">
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Buscar por ID, usuario, conductor o placas…"
            value={search} onChange={event => setSearch(event.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Usuario</th><th>Vehículo</th><th>Ruta</th>
              <th>Conductor</th><th>Tarifa</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <p className="muted">Cargando viajes…</p>
                </div>
              </td></tr>
            ) : error ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <span className="icon">⚠️</span>
                  <p style={{ fontWeight: 600 }}>No se pudieron cargar viajes</p>
                  <p className="muted">{error}</p>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <span className="icon">🚗</span>
                  <p style={{ fontWeight: 600 }}>Sin viajes</p>
                  <p className="muted">No hay solicitudes que coincidan con los filtros.</p>
                </div>
              </td></tr>
            ) : filtered.map(trip => {
              const user = one(trip.app_users)
              const driver = one(trip.drivers)
              const status = trip.status ?? ''

              return (
                <tr key={trip.id}>
                  <td className="mono td-bold">{trip.id}</td>
                  <td>
                    <p style={{ fontWeight: 500 }}>{user?.name ?? '—'}</p>
                    <span className="td-muted">{user?.type ?? user?.email ?? 'Sin usuario'}</span>
                  </td>
                  <td>
                    <p>{trip.vehicle_brand ?? 'Vehículo'} {trip.vehicle_model ?? ''}</p>
                    <span className="td-muted">{trip.vehicle_plates ?? 'Sin placas'}</span>
                  </td>
                  <td style={{ maxWidth: 180 }}>
                    <p style={{ fontSize: 12 }}>{trip.origin_address?.split(',')[0] ?? 'Origen pendiente'}</p>
                    <p className="td-muted">→ {trip.destination_address?.split(',')[0] ?? 'Destino pendiente'}</p>
                  </td>
                  <td>
                    {trip.driver_id
                      ? (
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500 }}>{driver?.name ?? 'Asignado'}</p>
                          {driver?.status && <span className="td-muted">{driver.status}</span>}
                        </div>
                      )
                      : PENDING.includes(status) && drivers.length > 0
                        ? (
                          <select className="filter-select" style={{ fontSize: 12 }}
                            defaultValue=""
                            onChange={event => event.target.value && assignDriver(trip.id, event.target.value)}
                            disabled={assigning === trip.id}>
                            <option value="">Asignar…</option>
                            {drivers.map(driverOption => (
                              <option key={driverOption.id} value={driverOption.id}>{driverOption.name ?? driverOption.id}</option>
                            ))}
                          </select>
                        )
                        : <span className="chip chip-warning">Sin conductor</span>
                    }
                  </td>
                  <td className="td-bold">{money(trip.client_price_mxn)}</td>
                  <td><Chip status={status || undefined}>{STATUS_LABELS[status] ?? 'Sin estatus'}</Chip></td>
                  <td>
                    <div className="td-actions">
                      <select className="filter-select" style={{ fontSize: 11 }}
                        value={status}
                        onChange={event => changeStatus(trip.id, event.target.value)}
                        disabled={updating === trip.id}>
                        {Object.entries(STATUS_LABELS).map(([key, value]) => (
                          <option key={key} value={key}>{value}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

'use client'
import { useState, useEffect, useCallback } from 'react'
import { Chip } from '@/components/ui/Chip'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

type Tab = 'Todos' | 'Pendientes' | 'En curso' | 'Finalizados' | 'Cancelados' | 'Incidencias'

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

export default function ViajesPage() {
  const [tab, setTab]         = useState<Tab>('Todos')
  const [search, setSearch]   = useState('')
  const [trips, setTrips]     = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const { showToast } = useAppStore()

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('trips')
      .select(`*, app_users(name, email, type)`)
      .order('created_at', { ascending: false })

    if (tab === 'Pendientes')  query = query.in('status', PENDING)
    if (tab === 'En curso')    query = query.in('status', ACTIVE)
    if (tab === 'Finalizados') query = query.eq('status', 'finalizado')
    if (tab === 'Cancelados')  query = query.eq('status', 'cancelado')
    if (tab === 'Incidencias') query = query.eq('status', 'incidente')

    const { data: tripsData } = await query
    const { data: driversData } = await supabase
      .from('drivers')
      .select('id, name, status')
      .in('status', ['disponible', 'activo'])

    setTrips(tripsData ?? [])
    setDrivers(driversData ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { loadData() }, [loadData])

  async function assignDriver(tripId: string, driverId: string) {
    setAssigning(tripId)
    const supabase = createClient()
    const { error } = await supabase
      .from('trips')
      .update({ driver_id: driverId, status: 'conductor_asignado' })
      .eq('id', tripId)

    if (error) { showToast('Error al asignar conductor'); setAssigning(null); return }
    await supabase.from('drivers').update({ status: 'en_viaje' }).eq('id', driverId)
    showToast('Conductor asignado ✓')
    setAssigning(null)
    loadData()
  }

  async function changeStatus(tripId: string, status: string) {
    const supabase = createClient()
    await supabase.from('trips').update({ status }).eq('id', tripId)
    showToast('Estatus actualizado ✓')
    loadData()
  }

  const filtered = trips.filter(t =>
    !search ||
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.app_users?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.vehicle_plates?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Viajes</h1>
          <p className="page-sub">{trips.length} traslados</p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Crear viaje — próximamente')}>
          + Nuevo viaje
        </button>
      </div>

      <div className="tabs">
        {(['Todos','Pendientes','En curso','Finalizados','Cancelados','Incidencias'] as Tab[]).map(t => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="filters-bar">
        <div className="filter-search">
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Buscar por ID, usuario o placas…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state"><p className="muted">Cargando viajes…</p></div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Usuario</th><th>Vehículo</th><th>Ruta</th>
                <th>Conductor</th><th>Tarifa</th><th>Estatus</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <span className="icon">🚗</span>
                    <p style={{ fontWeight: 600 }}>Sin viajes</p>
                    <p className="muted">Aún no hay solicitudes en esta categoría</p>
                  </div>
                </td></tr>
              ) : filtered.map(t => (
                <tr key={t.id}>
                  <td className="mono td-bold">{t.id}</td>
                  <td>
                    <p style={{ fontWeight: 500 }}>{t.app_users?.name ?? '—'}</p>
                    <span className="td-muted">{t.app_users?.type}</span>
                  </td>
                  <td>
                    <p>{t.vehicle_brand} {t.vehicle_model}</p>
                    <span className="td-muted">{t.vehicle_plates}</span>
                  </td>
                  <td style={{ maxWidth: 180 }}>
                    <p style={{ fontSize: 12 }}>{t.origin_address?.split(',')[0]}</p>
                    <p className="td-muted">→ {t.destination_address?.split(',')[0]}</p>
                  </td>
                  <td>
                    {t.driver_id
                      ? <span style={{ fontSize: 13, fontWeight: 500 }}>Asignado</span>
                      : PENDING.includes(t.status) && drivers.length > 0
                        ? (
                          <select className="filter-select" style={{ fontSize: 12 }}
                            defaultValue=""
                            onChange={e => e.target.value && assignDriver(t.id, e.target.value)}
                            disabled={assigning === t.id}>
                            <option value="">Asignar…</option>
                            {drivers.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        )
                        : <span className="chip chip-warning">Sin conductor</span>
                    }
                  </td>
                  <td className="td-bold">${Number(t.client_price_mxn).toLocaleString('es-MX')}</td>
                  <td><Chip status={t.status}>{STATUS_LABELS[t.status]}</Chip></td>
                  <td>
                    <div className="td-actions">
                      <select className="filter-select" style={{ fontSize: 11 }}
                        value={t.status}
                        onChange={e => changeStatus(t.id, e.target.value)}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { mockTrips } from '@/lib/mock-data'
import { useAppStore } from '@/lib/store'
import type { Trip, TripStatus } from '@/lib/types'

type Tab = 'Todos' | 'Pendientes' | 'En curso' | 'Finalizados' | 'Cancelados' | 'Incidencias'

const STATUS_LABELS: Record<string, string> = {
  solicitud_recibida: 'Solicitud recibida', pendiente_revision: 'En revisión',
  pendiente_asignacion: 'Sin conductor', conductor_asignado: 'Conductor asignado',
  conductor_en_camino: 'En camino', recoleccion_proceso: 'Recolección',
  evidencia_inicial_pendiente: 'Ev. inicial pend.', traslado_curso: 'En curso',
  entrega_proceso: 'Entrega', evidencia_final_pendiente: 'Ev. final pend.',
  finalizado: 'Finalizado', cancelado: 'Cancelado', incidente: 'Incidente',
}

const PENDING: TripStatus[] = ['solicitud_recibida','pendiente_revision','pendiente_asignacion']
const ACTIVE:  TripStatus[] = ['conductor_asignado','conductor_en_camino','recoleccion_proceso','evidencia_inicial_pendiente','traslado_curso','entrega_proceso','evidencia_final_pendiente']

function filterTrips(trips: Trip[], tab: Tab, search: string): Trip[] {
  let result = trips
  if (tab === 'Pendientes')   result = trips.filter(t => PENDING.includes(t.status))
  if (tab === 'En curso')     result = trips.filter(t => ACTIVE.includes(t.status))
  if (tab === 'Finalizados')  result = trips.filter(t => t.status === 'finalizado')
  if (tab === 'Cancelados')   result = trips.filter(t => t.status === 'cancelado')
  if (tab === 'Incidencias')  result = trips.filter(t => t.status === 'incidente')
  if (search) result = result.filter(t =>
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.user.name.toLowerCase().includes(search.toLowerCase()) ||
    t.vehicle.plates.toLowerCase().includes(search.toLowerCase())
  )
  return result
}

export default function ViajesPage() {
  const [tab, setTab]       = useState<Tab>('Todos')
  const [search, setSearch] = useState('')
  const { showToast }       = useAppStore()
  const trips = filterTrips(mockTrips, tab, search)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Viajes</h1>
          <p className="page-sub">{mockTrips.length} traslados en total</p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Crear viaje — próximamente')}>
          + Nuevo viaje
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['Todos','Pendientes','En curso','Finalizados','Cancelados','Incidencias'] as Tab[]).map(t => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-search">
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Buscar por ID, usuario o placas…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select">
          <option>Todos los tipos</option>
          <option>Personal</option><option>Empresarial</option>
          <option>Agencia</option><option>Flotilla</option>
        </select>
        <select className="filter-select">
          <option>Cualquier fecha</option>
          <option>Hoy</option><option>Esta semana</option><option>Este mes</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Usuario</th><th>Vehículo</th><th>Ruta</th>
              <th>Conductor</th><th>Fecha</th><th>Tarifa</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <span className="icon">🚗</span>
                  <p style={{ fontWeight: 600 }}>Sin viajes en esta categoría</p>
                  <p className="muted">Ajusta los filtros para ver resultados</p>
                </div>
              </td></tr>
            ) : trips.map(t => (
              <tr key={t.id}>
                <td className="mono td-bold">{t.id}</td>
                <td>
                  <p style={{ fontWeight: 500 }}>{t.user.name}</p>
                  <span className="td-muted">{t.user.type}</span>
                </td>
                <td>
                  <p>{t.vehicle.brand} {t.vehicle.model} {t.vehicle.year}</p>
                  <span className="td-muted">{t.vehicle.plates}</span>
                </td>
                <td style={{ maxWidth: 180 }}>
                  <p style={{ fontSize: 12 }}>{t.origin.address.split(',')[0]}</p>
                  <p className="td-muted">→ {t.destination.address.split(',')[0]}</p>
                </td>
                <td>{t.driver?.name ?? <span className="chip chip-warning">Sin asignar</span>}</td>
                <td className="td-muted">
                  {t.scheduledAt
                    ? new Date(t.scheduledAt).toLocaleDateString('es-MX')
                    : new Date(t.createdAt).toLocaleDateString('es-MX')}
                </td>
                <td className="td-bold">${t.clientPriceMXN.toLocaleString('es-MX')}</td>
                <td><Chip status={t.status}>{STATUS_LABELS[t.status]}</Chip></td>
                <td>
                  <div className="td-actions">
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => showToast(`Viaje ${t.id} seleccionado`)}>
                      Ver
                    </button>
                    {PENDING.includes(t.status) && (
                      <button className="btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => showToast(`Asignando conductor a ${t.id}…`)}>
                        Asignar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
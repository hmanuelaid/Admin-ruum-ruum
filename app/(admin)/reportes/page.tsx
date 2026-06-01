'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface ReportMetrics {
  totalViajes: number
  viajesFinalizados: number
  viajesCancelados: number
  tasaCancelacion: number
  ingresosBrutos: number
  pagoConductores: number
  margenOperativo: number
  ticketPromedio: number
  conductoresActivos: number
  usuariosActivos: number
  incidenciasTotal: number
  docsAprobados: number
}

interface TripRow {
  id: string
  status: string | null
  service_type: string | null
  origin_address: string | null
  destination_address: string | null
  client_price_mxn: number | null
  driver_pay_mxn: number | null
  created_at: string | null
  driver_name: string | null
  user_name: string | null
  vehicle_plates: string | null
}

type Range = '7d' | '30d' | '90d' | 'mes'

const RANGE_LABELS: Record<Range, string> = {
  '7d': 'Últimos 7 días', '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días', 'mes': 'Este mes',
}

const STATUS_LABELS: Record<string, string> = {
  finalizado: 'Finalizado', cancelado: 'Cancelado',
  traslado_curso: 'En tránsito', conductor_asignado: 'Asignado',
  pendiente_asignacion: 'Sin conductor', incidente: 'Incidente',
}

function money(v: number) {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
}

function getRangeStart(range: Range): Date {
  const now = new Date()
  if (range === '7d')  { now.setDate(now.getDate() - 7); return now }
  if (range === '30d') { now.setDate(now.getDate() - 30); return now }
  if (range === '90d') { now.setDate(now.getDate() - 90); return now }
  // mes: primer día del mes actual
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// ── CSV export ─────────────────────────────────────────────────────────────────
function exportCSV(rows: TripRow[], range: Range) {
  const headers = [
    'ID', 'Estatus', 'Tipo servicio', 'Origen', 'Destino',
    'Usuario', 'Conductor', 'Placas',
    'Tarifa cliente (MXN)', 'Pago conductor (MXN)', 'Fecha',
  ]
  const escape = (v: string | null | number) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`

  const lines = [
    headers.join(','),
    ...rows.map(r => [
      escape(r.id.slice(0, 8).toUpperCase()),
      escape(STATUS_LABELS[r.status ?? ''] ?? r.status),
      escape(r.service_type),
      escape(r.origin_address),
      escape(r.destination_address),
      escape(r.user_name),
      escape(r.driver_name),
      escape(r.vehicle_plates),
      escape(r.client_price_mxn),
      escape(r.driver_pay_mxn),
      escape(r.created_at ? new Date(r.created_at).toLocaleDateString('es-MX') : null),
    ].join(',')),
  ]

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `reporte-viajes-${range}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const { showToast } = useAppStore()
  const [range,    setRange]    = useState<Range>('30d')
  const [metrics,  setMetrics]  = useState<ReportMetrics | null>(null)
  const [trips,    setTrips]    = useState<TripRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [exporting, setExporting] = useState(false)

  const loadReport = useCallback(async (r: Range) => {
    setLoading(true)
    const supabase  = createClient()
    const fromDate  = getRangeStart(r).toISOString()

    type RawTrip = {
      id: string; status: string | null; service_type: string | null;
      origin_address: string | null; destination_address: string | null;
      client_price_mxn: number | null; driver_pay_mxn: number | null;
      created_at: string | null; vehicle_plates: string | null;
      drivers: { name: string | null } | { name: string | null }[] | null;
      app_users: { name: string | null } | { name: string | null }[] | null;
    }

    const [tripsRes, conductoresRes, usuariosRes, incidentesRes, docsRes] = await Promise.all([
      supabase.from('trips')
        .select('id, status, service_type, origin_address, destination_address, client_price_mxn, driver_pay_mxn, created_at, vehicle_plates, drivers(name), app_users(name)')
        .gte('created_at', fromDate)
        .order('created_at', { ascending: false }),
      supabase.from('drivers').select('id', { count: 'exact', head: true }).in('status', ['activo', 'disponible', 'en_viaje']),
      supabase.from('app_users').select('id', { count: 'exact', head: true }).eq('status', 'activo'),
      supabase.from('incidents').select('id', { count: 'exact', head: true }).gte('created_at', fromDate),
      supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'aprobado').gte('created_at', fromDate),
    ])

    const rawTrips = (tripsRes.data ?? []) as RawTrip[]
    const mapped: TripRow[] = rawTrips.map(t => ({
      id: t.id, status: t.status, service_type: t.service_type,
      origin_address: t.origin_address, destination_address: t.destination_address,
      client_price_mxn: t.client_price_mxn, driver_pay_mxn: t.driver_pay_mxn,
      created_at: t.created_at, vehicle_plates: t.vehicle_plates,
      driver_name: (Array.isArray(t.drivers) ? t.drivers[0] : t.drivers)?.name ?? null,
      user_name: (Array.isArray(t.app_users) ? t.app_users[0] : t.app_users)?.name ?? null,
    }))
    setTrips(mapped)

    const finalizados  = mapped.filter(t => t.status === 'finalizado')
    const cancelados   = mapped.filter(t => t.status === 'cancelado')
    const ingresos     = finalizados.reduce((s, t) => s + (t.client_price_mxn ?? 0), 0)
    const pagoCond     = finalizados.reduce((s, t) => s + (t.driver_pay_mxn   ?? 0), 0)

    setMetrics({
      totalViajes:        mapped.length,
      viajesFinalizados:  finalizados.length,
      viajesCancelados:   cancelados.length,
      tasaCancelacion:    mapped.length > 0 ? Math.round((cancelados.length / mapped.length) * 100) : 0,
      ingresosBrutos:     ingresos,
      pagoConductores:    pagoCond,
      margenOperativo:    ingresos - pagoCond,
      ticketPromedio:     finalizados.length > 0 ? ingresos / finalizados.length : 0,
      conductoresActivos: conductoresRes.count ?? 0,
      usuariosActivos:    usuariosRes.count ?? 0,
      incidenciasTotal:   incidentesRes.count ?? 0,
      docsAprobados:      docsRes.count ?? 0,
    })

    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => void loadReport(range))
  }, [range, loadReport])

  function handleExport() {
    setExporting(true)
    try {
      exportCSV(trips, range)
      showToast(`✅ CSV exportado — ${trips.length} registros`)
    } catch {
      showToast('Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  const m = metrics

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-sub">
            {loading ? 'Calculando…' : `${m?.totalViajes ?? 0} viajes · ${RANGE_LABELS[range]}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="filter-select" value={range} onChange={e => setRange(e.target.value as Range)}>
            {(Object.entries(RANGE_LABELS) as [Range, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={handleExport} disabled={exporting || loading || trips.length === 0}>
            {exporting ? 'Exportando…' : '⬇ Exportar CSV'}
          </button>
        </div>
      </div>

      {/* Métricas financieras */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        Financiero
      </p>
      <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Ingresos brutos',   value: loading ? '—' : money(m?.ingresosBrutos ?? 0),   color: 'rgba(34,197,94,.12)'   },
          { label: 'Pago conductores',  value: loading ? '—' : money(m?.pagoConductores ?? 0),  color: 'rgba(239,68,68,.10)'   },
          { label: 'Margen operativo',  value: loading ? '—' : money(m?.margenOperativo ?? 0),  color: 'rgba(56,189,248,.12)'  },
          { label: 'Ticket promedio',   value: loading ? '—' : money(m?.ticketPromedio ?? 0),   color: 'var(--primary-dim)'    },
        ].map(c => (
          <div key={c.label} className="metric-card">
            <div className="icon" style={{ background: c.color, fontSize: 20 }}>$</div>
            <p className="value" style={{ fontSize: 18 }}>{c.value}</p>
            <p className="label">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Métricas operativas */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        Operativo
      </p>
      <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total viajes',        value: loading ? '—' : m?.totalViajes ?? 0       },
          { label: 'Finalizados',         value: loading ? '—' : m?.viajesFinalizados ?? 0 },
          { label: 'Cancelados',          value: loading ? '—' : m?.viajesCancelados ?? 0  },
          { label: '% Cancelación',       value: loading ? '—' : `${m?.tasaCancelacion ?? 0}%` },
          { label: 'Conductores activos', value: loading ? '—' : m?.conductoresActivos ?? 0 },
          { label: 'Usuarios activos',    value: loading ? '—' : m?.usuariosActivos ?? 0   },
          { label: 'Incidencias',         value: loading ? '—' : m?.incidenciasTotal ?? 0  },
          { label: 'Docs aprobados',      value: loading ? '—' : m?.docsAprobados ?? 0     },
        ].map(c => (
          <div key={c.label} className="metric-card">
            <div className="icon" style={{ background: 'var(--primary-dim)', fontSize: 20 }}>—</div>
            <p className="value">{c.value}</p>
            <p className="label">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabla detalle */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Usuario</th><th>Conductor</th><th>Origen</th>
              <th>Estatus</th><th>Tarifa</th><th>Pago conductor</th><th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}>
                <div className="empty-state"><p className="muted">Cargando reporte…</p></div>
              </td></tr>
            ) : trips.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <span className="icon">📊</span>
                  <p style={{ fontWeight: 600 }}>Sin datos en el período</p>
                  <p className="muted">Ajusta el rango de fechas</p>
                </div>
              </td></tr>
            ) : trips.map(t => (
              <tr key={t.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.id.slice(0, 8).toUpperCase()}</td>
                <td className="td-bold">{t.user_name ?? '—'}</td>
                <td className="td-muted">{t.driver_name ?? '—'}</td>
                <td className="td-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.origin_address?.split(',')[0] ?? '—'}
                </td>
                <td>
                  <span className={`chip chip-${t.status === 'finalizado' ? 'success' : t.status === 'cancelado' ? 'danger' : 'warning'}`}>
                    {STATUS_LABELS[t.status ?? ''] ?? t.status}
                  </span>
                </td>
                <td className="td-bold">{t.client_price_mxn ? money(t.client_price_mxn) : '—'}</td>
                <td className="td-muted">{t.driver_pay_mxn ? money(t.driver_pay_mxn) : '—'}</td>
                <td className="td-muted">
                  {t.created_at ? new Date(t.created_at).toLocaleDateString('es-MX') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

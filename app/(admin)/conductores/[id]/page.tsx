import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Chip } from '@/components/ui/Chip'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getStoragePath } from '@/lib/storage'
import type { DriverStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

type DriverRow = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  state: string | null
  status: DriverStatus | string | null
  certified: boolean | null
  rating: number | null
  trips_completed: number | null
  earnings: number | null
  bank_account: string | null
  created_at: string | null
}

type DocumentRow = {
  id: string
  type: string | null
  status: string | null
  url: string | null
  storage_path: string | null
  uploaded_at: string | null
  expires_at: string | null
}

type SignedDocumentRow = DocumentRow & {
  signedUrl: string | null
}

type TripRow = {
  id: string
  status: string | null
  service_type: string | null
  origin_address: string | null
  destination_address: string | null
  vehicle_plates: string | null
  client_price_mxn: number | null
  driver_pay_mxn: number | null
  created_at: string | null
}

const STATUS_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  en_viaje: 'En viaje',
  pendiente_validacion: 'Pendiente',
  activo: 'Activo',
  no_disponible: 'No disponible',
  suspendido: 'Suspendido',
  bloqueado: 'Bloqueado',
  documentacion_vencida: 'Doc. vencida',
}

const TRIP_STATUS_LABELS: Record<string, string> = {
  solicitud_recibida: 'Solicitud',
  pendiente_revision: 'En revisión',
  pendiente_asignacion: 'Sin asignar',
  conductor_asignado: 'Asignado',
  conductor_en_camino: 'En camino',
  recoleccion_proceso: 'Recolección',
  evidencia_inicial_pendiente: 'Ev. inicial pendiente',
  traslado_curso: 'En traslado',
  entrega_proceso: 'Entrega',
  evidencia_final_pendiente: 'Ev. final pendiente',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  incidente: 'Incidente',
}

const SERVICE_LABELS: Record<string, string> = {
  personal: 'Personal',
  empresarial: 'Empresarial',
  agencia: 'Agencia',
  lote: 'Lote',
  flotilla: 'Flotilla',
  entrega_cliente: 'Entrega a cliente',
  recuperacion: 'Recuperación',
  especial: 'Especial',
}

function money(value: number | null) {
  return value != null ? `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString('es-MX') : '—'
}

export default async function ConductorDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [driverRes, docsRes, tripsRes] = await Promise.all([
    supabase
      .from('drivers')
      .select('id, name, phone, email, state, status, certified, rating, trips_completed, earnings, bank_account, created_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('documents')
      .select('id, type, status, url, storage_path, uploaded_at, expires_at')
      .eq('owner_id', id)
      .eq('owner_type', 'driver')
      .order('uploaded_at', { ascending: false }),
    supabase
      .from('trips')
      .select('id, status, service_type, origin_address, destination_address, vehicle_plates, client_price_mxn, driver_pay_mxn, created_at')
      .eq('driver_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (driverRes.error || !driverRes.data) {
    notFound()
  }

  const driver = driverRes.data as DriverRow
  const documentRows = (docsRes.data ?? []) as DocumentRow[]
  const documents: SignedDocumentRow[] = await Promise.all(documentRows.map(async doc => {
    const storagePath = doc.storage_path ?? getStoragePath(doc.url, 'documents')
    if (!storagePath) return { ...doc, signedUrl: null }

    const { data } = await supabase.storage.from('documents').createSignedUrl(storagePath, 300)
    return { ...doc, signedUrl: data?.signedUrl ?? null }
  }))
  const trips = (tripsRes.data ?? []) as TripRow[]
  const documentWarning = docsRes.error?.message ?? null
  const tripWarning = tripsRes.error?.message ?? null
  const activeTrips = trips.filter(trip => ['conductor_asignado', 'conductor_en_camino', 'recoleccion_proceso', 'traslado_curso', 'entrega_proceso'].includes(trip.status ?? '')).length

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link className="btn-icon" href="/conductores" title="Regresar" aria-label="Regresar">
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
            </svg>
          </Link>
          <div>
            <h1 className="page-title">{driver.name ?? 'Conductor'}</h1>
            <p className="page-sub">{driver.email ?? 'Sin correo'} · {driver.phone ?? 'Sin telefono'}</p>
          </div>
        </div>
        <Chip status={driver.status ?? undefined}>{STATUS_LABELS[driver.status ?? ''] ?? driver.status ?? '—'}</Chip>
      </div>

      <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Viajes completados', value: driver.trips_completed ?? 0 },
          { label: 'Viajes activos', value: activeTrips },
          { label: 'Documentos', value: documents.length },
          { label: 'Ganancias', value: money(driver.earnings) },
        ].map(metric => (
          <div key={metric.label} className="metric-card">
            <div className="icon" style={{ background: 'var(--primary-dim)', fontSize: 20 }}>—</div>
            <p className="value">{metric.value}</p>
            <p className="label">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="detail-grid">
        <div className="stack">
          <div className="table-wrap" style={{ padding: '1rem 1.25rem' }}>
            <p className="card-title" style={{ marginBottom: 16 }}>Datos del conductor</p>
            <div className="detail-grid-2">
              {[  
                ['Estado', driver.state ?? '—'],
                ['Certificado', driver.certified ? 'Sí' : 'No'],
                ['Rating', driver.rating != null ? driver.rating.toFixed(1) : '—'],
                ['Viajes completados', String(driver.trips_completed ?? 0)],
                ['Ganancias', money(driver.earnings)],
                ['Registro', date(driver.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="detail-section">
                  <span className="detail-label">{label}</span>
                  <span className="detail-value">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            {documentWarning && (
              <div className="alert warning" style={{ margin: '1rem 1.25rem 0' }}>
                <span>!</span>
                <p>No se pudieron cargar documentos: {documentWarning}</p>
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Estatus</th>
                  <th>Subido</th>
                  <th>Vence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <p className="muted">Sin documentos registrados</p>
                      </div>
                    </td>
                  </tr>
                ) : documents.map(doc => (
                  <tr key={doc.id}>
                    <td className="td-bold">{doc.type ?? '—'}</td>
                    <td><Chip status={doc.status ?? undefined}>{doc.status ?? '—'}</Chip></td>
                    <td className="td-muted">{date(doc.uploaded_at)}</td>
                    <td className="td-muted">{date(doc.expires_at)}</td>
                    <td>
                      {doc.signedUrl ? (
                        <a className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} href={doc.signedUrl} target="_blank" rel="noreferrer">
                          Ver archivo
                        </a>
                      ) : (
                        <span className="td-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-wrap">
            {tripWarning && (
              <div className="alert warning" style={{ margin: '1rem 1.25rem 0' }}>
                <span>!</span>
                <p>No se pudieron cargar viajes: {tripWarning}</p>
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>Viaje</th>
                  <th>Servicio</th>
                  <th>Ruta</th>
                  <th>Placas</th>
                  <th>Pago</th>
                  <th>Estatus</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <p className="muted">Sin viajes registrados para este conductor</p>
                      </div>
                    </td>
                  </tr>
                ) : trips.map(trip => (
                  <tr key={trip.id}>
                    <td>
                      <Link className="mono td-bold" href={`/viajes/${trip.id}`}>
                        {trip.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="td-muted">{SERVICE_LABELS[trip.service_type ?? ''] ?? trip.service_type ?? '—'}</td>
                    <td style={{ maxWidth: 240 }}>
                      <p style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trip.origin_address ?? '—'}</p>
                      <p className="td-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trip.destination_address ?? '—'}</p>
                    </td>
                    <td className="td-muted">{trip.vehicle_plates ?? '—'}</td>
                    <td className="td-bold">{money(trip.driver_pay_mxn)}</td>
                    <td><Chip status={trip.status ?? undefined}>{TRIP_STATUS_LABELS[trip.status ?? ''] ?? trip.status ?? '—'}</Chip></td>
                    <td className="td-muted">{date(trip.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-wrap" style={{ padding: '1rem 1.25rem' }}>
          <p className="card-title" style={{ marginBottom: 16 }}>Cuenta bancaria</p>
          <p className="mono" style={{ wordBreak: 'break-word' }}>{driver.bank_account ?? 'Sin cuenta registrada'}</p>
        </div>
      </div>
    </>
  )
}

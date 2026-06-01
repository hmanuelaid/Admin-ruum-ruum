'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface LogEntry {
  id: string
  admin_id: string | null
  admin_name: string | null
  action: string
  entity: string | null
  entity_id: string | null
  detail: string | null
  created_at: string
}

const ENTITY_LABELS: Record<string, string> = {
  trip: 'Viaje', driver: 'Conductor', user: 'Usuario',
  payment: 'Pago', incident: 'Incidencia', document: 'Documento',
  config: 'Configuración', admin: 'Admin',
}

const ACTION_ICONS: Record<string, string> = {
  create: '➕', update: '✏️', delete: '🗑️', approve: '✅',
  reject: '❌', assign: '👤', escalate: '⬆️', resolve: '🔒',
  login: '🔑', logout: '🚪', export: '⬇️',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `hace ${days}d`
  return new Date(iso).toLocaleDateString('es-MX')
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function BitacoraPage() {
  const { showToast } = useAppStore()

  const [logs,         setLogs]         = useState<LogEntry[]>([])
  const [loading,      setLoading]      = useState(true)
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(0)
  const [hasMore,      setHasMore]      = useState(true)
  const PAGE_SIZE = 50

  const loadLogs = useCallback(async (reset = false) => {
    if (reset) { setPage(0); setLogs([]) }
    const supabase  = createClient()
    const from      = reset ? 0 : page * PAGE_SIZE
    const to        = from + PAGE_SIZE - 1

    const query = supabase
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (entityFilter) query.eq('entity', entityFilter)
    if (actionFilter) query.eq('action', actionFilter)

    const { data, error } = await query

    if (error) {
      // Tabla aún no creada — mostrar estado vacío sin romper
      if (error.code === '42P01') {
        setLoading(false)
        return
      }
      showToast(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    const entries = (data ?? []) as LogEntry[]
    setLogs(prev => reset ? entries : [...prev, ...entries])
    setHasMore(entries.length === PAGE_SIZE)
    setPage(prev => reset ? 1 : prev + 1)
    setLoading(false)
  }, [page, entityFilter, actionFilter, showToast])

  useEffect(() => {
    setLoading(true)
    void loadLogs(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter, actionFilter])

  // Realtime — nuevas entradas aparecen sin recargar
  useEffect(() => {
    const supabase = createClient()
    const channel  = supabase.channel('bitacora-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_activity_log' }, payload => {
        setLogs(prev => [payload.new as LogEntry, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = logs.filter(log => {
    const q = search.trim().toLowerCase()
    return !q ||
      (log.admin_name ?? '').toLowerCase().includes(q) ||
      (log.detail     ?? '').toLowerCase().includes(q) ||
      (log.action     ?? '').toLowerCase().includes(q) ||
      (log.entity_id  ?? '').toLowerCase().includes(q)
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bitácora</h1>
          <p className="page-sub">Registro de actividad del equipo administrativo</p>
        </div>
      </div>

      {/* SQL helper — solo visible si no hay logs */}
      {!loading && logs.length === 0 && (
        <div className="table-wrap" style={{ padding: '1.25rem', marginBottom: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
            SQL — crear tabla admin_activity_log
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Ejecuta esto en Supabase para activar la bitácora:
          </p>
          <pre style={{ fontSize: 11, background: 'var(--surface-2)', padding: '12px', borderRadius: 6, overflow: 'auto', lineHeight: 1.6, color: 'var(--text)' }}>
{`create table public.admin_activity_log (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid references public.admin_users(id) on delete set null,
  admin_name text,
  action     text not null,
  entity     text,
  entity_id  text,
  detail     text,
  created_at timestamptz default now()
);
alter table public.admin_activity_log enable row level security;
create policy "Admins pueden leer bitácora"
  on public.admin_activity_log for select using (true);
create policy "Admins pueden insertar en bitácora"
  on public.admin_activity_log for insert with check (true);`}
          </pre>
        </div>
      )}

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-search">
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Buscar por admin, acción o detalle…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
          <option value="">Todas las entidades</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="filter-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">Todas las acciones</option>
          {Object.keys(ACTION_ICONS).map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      {/* Timeline */}
      <div className="table-wrap">
        {loading ? (
          <div className="empty-state"><p className="muted">Cargando bitácora…</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="icon">📋</span>
            <p style={{ fontWeight: 600 }}>Sin registros</p>
            <p className="muted">
              {logs.length === 0
                ? 'Crea la tabla admin_activity_log en Supabase para empezar a registrar actividad'
                : 'No hay entradas que coincidan con los filtros'}
            </p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Acción</th>
                  <th>Admin</th>
                  <th>Entidad</th>
                  <th>Detalle</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id}>
                    <td style={{ textAlign: 'center', fontSize: 16 }}>
                      {ACTION_ICONS[log.action] ?? '📝'}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                        background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 4 }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="td-bold">{log.admin_name ?? '—'}</td>
                    <td>
                      {log.entity && (
                        <div>
                          <span style={{ fontSize: 12 }}>{ENTITY_LABELS[log.entity] ?? log.entity}</span>
                          {log.entity_id && (
                            <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                              {log.entity_id.slice(0, 8).toUpperCase()}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="td-muted" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.detail ?? '—'}
                    </td>
                    <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>
                      <span title={new Date(log.created_at).toLocaleString('es-MX')}>
                        {timeAgo(log.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginación */}
            {hasMore && (
              <div style={{ padding: '16px', textAlign: 'center', borderTop: '0.5px solid var(--border)' }}>
                <button className="btn-secondary" style={{ fontSize: 13 }}
                  onClick={() => void loadLogs(false)}>
                  Cargar más registros
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
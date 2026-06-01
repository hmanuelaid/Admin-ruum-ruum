'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Chip } from '@/components/ui/Chip'
import { useAppStore } from '@/lib/store'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface PaymentRow {
  id: string
  type: string | null
  status: string | null
  amount: number | null
  concept: string | null
  trip_id: string | null
  driver_id: string | null
  user_id: string | null
  created_at: string | null
  paid_at: string | null
  notes: string | null
  driver_name: string | null
  user_name: string | null
}

type PayStatus = 'pendiente' | 'en_revision' | 'pagado' | 'rechazado' | 'ajustado'

type PaymentMetrics = {
  pendientes: number
  pagados: number
  totalPagado: number
  rechazados: number
}

type PaymentsPayload = {
  payments?: PaymentRow[]
  metrics?: PaymentMetrics
  total?: number
  page?: number
  pageSize?: number
  error?: string
}

const PAGE_SIZE = 25

const STATUS_LABELS: Record<string, string> = {
  pendiente:   'Pendiente',
  en_revision: 'En revisión',
  pagado:      'Pagado',
  rechazado:   'Rechazado',
  ajustado:    'Ajustado',
}

const TYPE_LABELS: Record<string, string> = {
  cobro_usuario:      'Cobro usuario',
  pago_conductor:     'Pago conductor',
  gasto:              'Gasto',
}

function money(v: number | null) {
  return v != null ? `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'
}

async function postAdminOperation(path: string, payload: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo completar la operación')
  }

  return data
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function PagosPage() {
  const router = useRouter()
  const { showToast } = useAppStore()

  const [payments,      setPayments]      = useState<PaymentRow[]>([])
  const [loading,       setLoading]       = useState(true)
  const [statusFilter,  setStatusFilter]  = useState('')
  const [typeFilter,    setTypeFilter]    = useState('')
  const [search,        setSearch]        = useState('')
  const [metrics,       setMetrics]       = useState<PaymentMetrics>({ pendientes: 0, pagados: 0, totalPagado: 0, rechazados: 0 })
  const [total,         setTotal]         = useState(0)
  const [page,          setPage]          = useState(1)
  const [updating,      setUpdating]      = useState<string | null>(null)
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set())
  const [bulkSaving,    setBulkSaving]    = useState(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Carga ──────────────────────────────────────────────────────────────────
  const loadPayments = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    })
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter) params.set('type', typeFilter)
    if (search.trim()) params.set('search', search.trim())

    try {
      const response = await fetch(`/api/admin/payments?${params.toString()}`, { cache: 'no-store' })
      const data = await response.json().catch(() => ({})) as PaymentsPayload

      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudieron cargar pagos')
      }

      setPayments(data.payments ?? [])
      setMetrics(data.metrics ?? { pendientes: 0, pagados: 0, totalPagado: 0, rechazados: 0 })
      setTotal(data.total ?? 0)
    } catch (error) {
      showToast(`Error cargando pagos: ${error instanceof Error ? error.message : 'operación fallida'}`)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [page, search, showToast, statusFilter, typeFilter])

  const schedulePaymentsReload = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      void loadPayments(false)
    }, 900)
  }, [loadPayments])

  useEffect(() => {
    const timeout = setTimeout(() => void loadPayments(), 250)

    return () => clearTimeout(timeout)
  }, [loadPayments])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel('pagos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, schedulePaymentsReload)
      .subscribe()

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [schedulePaymentsReload])

  // ── Cambiar estatus individual ─────────────────────────────────────────────
  async function handleStatusChange(payId: string, newStatus: string) {
    setUpdating(payId)
    const paidAt = newStatus === 'pagado' ? new Date().toISOString() : null
    try {
      await postAdminOperation('/api/admin/payments/status', {
        paymentIds: [payId],
        status: newStatus,
      })
      setPayments(prev => prev.map(p =>
        p.id === payId ? { ...p, status: newStatus, ...(paidAt ? { paid_at: paidAt } : {}) } : p
      ))
      showToast(`✅ Pago marcado como ${STATUS_LABELS[newStatus] ?? newStatus}`)
      void loadPayments(false)
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'operación fallida'}`)
    } finally {
      setUpdating(null)
    }
  }

  // ── Acciones en lote ───────────────────────────────────────────────────────
  async function handleBulkAction(newStatus: PayStatus) {
    if (selectedIds.size === 0) return
    setBulkSaving(true)
    const ids = [...selectedIds]
    const paidAt = newStatus === 'pagado' ? new Date().toISOString() : null

    try {
      await postAdminOperation('/api/admin/payments/status', {
        paymentIds: ids,
        status: newStatus,
      })
      setPayments(prev => prev.map(p =>
        ids.includes(p.id) ? { ...p, status: newStatus, ...(paidAt ? { paid_at: paidAt } : {}) } : p
      ))
      setSelectedIds(new Set())
      showToast(`✅ ${ids.length} pagos marcados como ${STATUS_LABELS[newStatus]}`)
      void loadPayments(false)
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'operación fallida'}`)
    } finally {
      setBulkSaving(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === payments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(payments.map(p => p.id)))
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
    setSelectedIds(new Set())
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value)
    setPage(1)
    setSelectedIds(new Set())
  }

  function handleTypeFilterChange(value: string) {
    setTypeFilter(value)
    setPage(1)
    setSelectedIds(new Set())
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pendingSelected = payments.filter(p => selectedIds.has(p.id) && (p.status === 'pendiente' || p.status === 'en_revision'))

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pagos</h1>
          <p className="page-sub">
            {loading ? 'Cargando…' : `${total} registros · ${metrics.pendientes} pendientes`}
          </p>
        </div>
          <button className="btn-primary" onClick={() => router.push('/pagos/nuevo')}>
  + Pago manual
</button>
      </div>

      {/* Métricas */}
      <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Pendientes',    value: metrics.pendientes,                                       color: 'rgba(245,158,11,.12)' },
          { label: 'Pagados',       value: metrics.pagados,                                          color: 'rgba(34,197,94,.12)'  },
          { label: 'Total pagado',  value: money(metrics.totalPagado),                               color: 'rgba(56,189,248,.12)' },
          { label: 'Rechazados',    value: metrics.rechazados,                                       color: 'rgba(239,68,68,.10)'  },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="icon" style={{ background: m.color, fontSize: 20 }}>$</div>
            <p className="value">{m.value}</p>
            <p className="label">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-search">
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Buscar por concepto, conductor o usuario…"
            value={search} onChange={e => handleSearchChange(e.target.value)} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e => handleStatusFilterChange(e.target.value)}>
          <option value="">Todos los estatus</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="filter-select" value={typeFilter} onChange={e => handleTypeFilterChange(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Barra de acciones en lote */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--primary-dim)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>{selectedIds.size} seleccionados</span>
          <span className="muted">·</span>
          {pendingSelected.length > 0 && (
            <button className="btn-primary" style={{ fontSize: 12 }}
              onClick={() => handleBulkAction('pagado')} disabled={bulkSaving}>
              {bulkSaving ? 'Procesando…' : `✅ Aprobar ${pendingSelected.length}`}
            </button>
          )}
          {pendingSelected.length > 0 && (
            <button className="btn-secondary" style={{ fontSize: 12, color: 'var(--danger)' }}
              onClick={() => handleBulkAction('rechazado')} disabled={bulkSaving}>
              ✗ Rechazar {pendingSelected.length}
            </button>
          )}
          <button className="btn-secondary" style={{ fontSize: 12 }}
            onClick={() => setSelectedIds(new Set())}>
            Limpiar selección
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox"
                  checked={payments.length > 0 && selectedIds.size === payments.length}
                  onChange={toggleSelectAll} />
              </th>
              <th>Concepto</th>
              <th>Tipo</th>
              <th>Conductor / Usuario</th>
              <th>Monto</th>
              <th>Estatus</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}>
                <div className="empty-state"><p className="muted">Cargando pagos…</p></div>
              </td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <span className="icon">💳</span>
                  <p style={{ fontWeight: 600 }}>Sin pagos</p>
                  <p className="muted">No hay registros que coincidan con los filtros</p>
                </div>
              </td></tr>
            ) : payments.map(p => (
              <tr key={p.id} style={{ background: selectedIds.has(p.id) ? 'var(--primary-dim)' : undefined }}>
                <td>
                  <input type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelect(p.id)} />
                </td>
                <td>
                  <p className="td-bold">{p.concept ?? '—'}</p>
                  {p.trip_id && (
                    <span className="td-muted" style={{ fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', color: 'var(--primary)' }}
                      onClick={() => router.push(`/viajes/${p.trip_id}`)}>
                      Viaje #{p.trip_id.slice(0, 8).toUpperCase()} ↗
                    </span>
                  )}
                </td>
                <td>
                  <Chip variant="primary">{TYPE_LABELS[p.type ?? ''] ?? p.type ?? '—'}</Chip>
                </td>
                <td>
                  {p.driver_name && <p style={{ fontSize: 13 }}>🧑 {p.driver_name}</p>}
                  {p.user_name   && <p style={{ fontSize: 13 }}>👤 {p.user_name}</p>}
                  {!p.driver_name && !p.user_name && <span className="td-muted">—</span>}
                </td>
                <td className="td-bold" style={{ fontSize: 15 }}>{money(p.amount)}</td>
                <td><Chip status={p.status ?? undefined}>{STATUS_LABELS[p.status ?? ''] ?? p.status}</Chip></td>
                <td className="td-muted">
                  {p.paid_at
                    ? `Pagado ${new Date(p.paid_at).toLocaleDateString('es-MX')}`
                    : p.created_at ? new Date(p.created_at).toLocaleDateString('es-MX') : '—'}
                </td>
                <td>
                  <div className="td-actions">
                    {(p.status === 'pendiente' || p.status === 'en_revision') && (
                      <>
                        <button className="btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={() => handleStatusChange(p.id, 'pagado')}
                          disabled={updating === p.id}>
                          {updating === p.id ? '…' : '✅ Aprobar'}
                        </button>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--danger)' }}
                          onClick={() => handleStatusChange(p.id, 'rechazado')}
                          disabled={updating === p.id}>
                          ✗ Rechazar
                        </button>
                      </>
                    )}
                    {p.status === 'pagado' && (
                      <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => handleStatusChange(p.id, 'ajustado')}
                        disabled={updating === p.id}>
                        Ajustar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '10px 2px',
      }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {total} resultado{total !== 1 ? 's' : ''} · página {page} de {totalPages}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ fontSize: 12 }}
            disabled={page <= 1 || loading}
            onClick={() => { setSelectedIds(new Set()); setPage(prev => Math.max(1, prev - 1)) }}>
            Anterior
          </button>
          <button className="btn-secondary" style={{ fontSize: 12 }}
            disabled={page >= totalPages || loading}
            onClick={() => { setSelectedIds(new Set()); setPage(prev => Math.min(totalPages, prev + 1)) }}>
            Siguiente
          </button>
        </div>
      </div>
    </>
  )
}

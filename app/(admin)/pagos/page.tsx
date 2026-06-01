'use client'
import { useEffect, useMemo, useState } from 'react'
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
  reembolso:          'Reembolso',
  ajuste:             'Ajuste',
  penalizacion:       'Penalización',
  bono:               'Bono',
}

function money(v: number | null) {
  return v != null ? `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'
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
  const [updating,      setUpdating]      = useState<string | null>(null)
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set())
  const [bulkSaving,    setBulkSaving]    = useState(false)

  // ── Carga ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function load() {
      setLoading(true)

      type RawPay = {
        id: string; type: string | null; status: string | null; amount: number | null;
        concept: string | null; trip_id: string | null; driver_id: string | null;
        user_id: string | null; created_at: string | null; paid_at: string | null; notes: string | null;
        drivers: { name: string | null } | { name: string | null }[] | null;
        app_users: { name: string | null } | { name: string | null }[] | null;
      }

      const { data, error } = await supabase
        .from('payments')
        .select('*, drivers(name), app_users(name)')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        showToast(`Error cargando pagos: ${error.message}`)
        setLoading(false)
        return
      }

      setPayments(((data ?? []) as RawPay[]).map(p => ({
        id: p.id, type: p.type, status: p.status, amount: p.amount,
        concept: p.concept, trip_id: p.trip_id, driver_id: p.driver_id,
        user_id: p.user_id, created_at: p.created_at, paid_at: p.paid_at, notes: p.notes,
        driver_name: (Array.isArray(p.drivers) ? p.drivers[0] : p.drivers)?.name ?? null,
        user_name:   (Array.isArray(p.app_users) ? p.app_users[0] : p.app_users)?.name ?? null,
      })))
      setLoading(false)
    }

    void load()

    // Realtime
    const channel = supabase.channel('pagos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => void load())
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [showToast])

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return payments.filter(p => {
      const matchSearch = !q ||
        (p.concept ?? '').toLowerCase().includes(q) ||
        (p.driver_name ?? '').toLowerCase().includes(q) ||
        (p.user_name ?? '').toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      const matchStatus = !statusFilter || p.status === statusFilter
      const matchType   = !typeFilter   || p.type   === typeFilter
      return matchSearch && matchStatus && matchType
    })
  }, [payments, search, statusFilter, typeFilter])

  // ── Métricas rápidas ───────────────────────────────────────────────────────
  const metrics = useMemo(() => ({
    pendientes:  payments.filter(p => p.status === 'pendiente' || p.status === 'en_revision').length,
    pagados:     payments.filter(p => p.status === 'pagado').length,
    totalPagado: payments.filter(p => p.status === 'pagado').reduce((s, p) => s + (p.amount ?? 0), 0),
    rechazados:  payments.filter(p => p.status === 'rechazado').length,
  }), [payments])

  // ── Cambiar estatus individual ─────────────────────────────────────────────
  async function handleStatusChange(payId: string, newStatus: string) {
    setUpdating(payId)
    const supabase = createClient()
    const extra = newStatus === 'pagado' ? { paid_at: new Date().toISOString() } : {}

    const { error } = await supabase
      .from('payments')
      .update({ status: newStatus, ...extra })
      .eq('id', payId)

    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setPayments(prev => prev.map(p =>
        p.id === payId ? { ...p, status: newStatus, ...(newStatus === 'pagado' ? { paid_at: new Date().toISOString() } : {}) } : p
      ))
      showToast(`✅ Pago marcado como ${STATUS_LABELS[newStatus] ?? newStatus}`)
    }
    setUpdating(null)
  }

  // ── Acciones en lote ───────────────────────────────────────────────────────
  async function handleBulkAction(newStatus: PayStatus) {
    if (selectedIds.size === 0) return
    setBulkSaving(true)
    const supabase = createClient()
    const ids = [...selectedIds]
    const extra = newStatus === 'pagado' ? { paid_at: new Date().toISOString() } : {}

    const { error } = await supabase
      .from('payments')
      .update({ status: newStatus, ...extra })
      .in('id', ids)

    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setPayments(prev => prev.map(p =>
        ids.includes(p.id) ? { ...p, status: newStatus } : p
      ))
      setSelectedIds(new Set())
      showToast(`✅ ${ids.length} pagos marcados como ${STATUS_LABELS[newStatus]}`)
    }
    setBulkSaving(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)))
    }
  }

  const pendingSelected = filtered.filter(p => selectedIds.has(p.id) && (p.status === 'pendiente' || p.status === 'en_revision'))

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pagos</h1>
          <p className="page-sub">
            {loading ? 'Cargando…' : `${payments.length} registros · ${metrics.pendientes} pendientes`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Pago manual — próximamente')}>
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
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Todos los estatus</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
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
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
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
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <span className="icon">💳</span>
                  <p style={{ fontWeight: 600 }}>Sin pagos</p>
                  <p className="muted">No hay registros que coincidan con los filtros</p>
                </div>
              </td></tr>
            ) : filtered.map(p => (
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
    </>
  )
}
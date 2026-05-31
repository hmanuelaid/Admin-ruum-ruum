'use client'
import { useEffect, useMemo, useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import type { PaymentStatus } from '@/lib/types'

type Tab = 'Todos' | 'Cobros' | 'Conductores' | 'Gastos'

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', en_revision: 'En revisión', aprobado: 'Aprobado',
  rechazado: 'Rechazado', pagado: 'Pagado', revocado: 'Revocado', ajustado: 'Ajustado',
}

const TYPE_LABELS: Record<string, string> = {
  cobro_usuario: 'Cobro al usuario',
  pago_conductor: 'Pago al conductor',
  gasto: 'Gasto',
}

interface PaymentRow {
  id: string
  trip_id: string | null
  type: string | null
  amount: number | null
  status: PaymentStatus | string | null
  method: string | null
  concept: string | null
  approved_by: string | null
  paid_at: string | null
  created_at: string | null
  updated_at: string | null
}

function money(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString('es-MX')}`
}

export default function PagosPage() {
  const [tab, setTab] = useState<Tab>('Todos')
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const { showToast } = useAppStore()

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function loadPayments() {
      setLoading(true)
      setError('')

      const { data, error: loadError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (loadError) {
        setError(loadError.message)
        setPayments([])
        showToast(`No se pudieron cargar pagos: ${loadError.message}`)
      } else {
        setPayments((data ?? []) as PaymentRow[])
      }

      setLoading(false)
    }

    void loadPayments()

    const channel = supabase
      .channel('admin-payments')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'payments',
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setPayments(prev => [payload.new as PaymentRow, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setPayments(prev => prev.map(payment =>
            payment.id === (payload.new as PaymentRow).id ? payload.new as PaymentRow : payment
          ))
        } else if (payload.eventType === 'DELETE') {
          setPayments(prev => prev.filter(payment => payment.id !== (payload.old as PaymentRow).id))
        }
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [showToast])

  const filteredPayments = useMemo(() => payments.filter(payment => {
    if (tab === 'Cobros') return payment.type === 'cobro_usuario'
    if (tab === 'Conductores') return payment.type === 'pago_conductor'
    if (tab === 'Gastos') return payment.type === 'gasto'
    return true
  }), [payments, tab])

  const totals = useMemo(() => ({
    pendiente: payments
      .filter(payment => payment.status === 'pendiente')
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
    pagado: payments
      .filter(payment => payment.status === 'pagado')
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
    cobros: payments
      .filter(payment => payment.type === 'cobro_usuario')
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
    conductores: payments
      .filter(payment => payment.type === 'pago_conductor')
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
  }), [payments])

  async function approvePayment(paymentId: string) {
    setProcessing(paymentId)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status: 'aprobado', updated_at: new Date().toISOString() })
      .eq('id', paymentId)

    if (updateError) {
      showToast(`No se pudo aprobar el pago: ${updateError.message}`)
    } else {
      setPayments(prev => prev.map(payment =>
        payment.id === paymentId ? { ...payment, status: 'aprobado', updated_at: new Date().toISOString() } : payment
      ))
      showToast('Pago aprobado')
    }

    setProcessing(null)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pagos</h1>
          <p className="page-sub">
            {loading ? 'Cargando pagos…' : `${payments.length} movimientos registrados`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => showToast('Registrar pago — próximamente')}>
          + Registrar pago
        </button>
      </div>

      {/* Métricas */}
      <div className="metrics-grid">
        {[
          { label: 'Pendientes', value: money(totals.pendiente), icon: '⏳', color: 'rgba(245,158,11,.12)' },
          { label: 'Pagados', value: money(totals.pagado), icon: '✅', color: 'rgba(34,197,94,.12)' },
          { label: 'Cobros usuarios', value: money(totals.cobros), icon: '💳', color: 'var(--primary-dim)' },
          { label: 'Pago conductores', value: money(totals.conductores), icon: '🧑', color: 'rgba(56,189,248,.12)' },
        ].map(metric => (
          <div key={metric.label} className="metric-card">
            <div className="icon" style={{ background: metric.color }}>{metric.icon}</div>
            <p className="value" style={{ fontSize: 20 }}>{metric.value}</p>
            <p className="label">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['Todos','Cobros','Conductores','Gastos'] as Tab[]).map(item => (
          <button key={item} className={`tab${tab === item ? ' active' : ''}`} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>

      {/* Tabla */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Viaje</th><th>Concepto</th><th>Tipo</th>
              <th>Monto</th><th>Fecha</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <p className="muted">Cargando pagos…</p>
                </div>
              </td></tr>
            ) : error ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <span className="icon">⚠️</span>
                  <p style={{ fontWeight: 600 }}>No se pudieron cargar pagos</p>
                  <p className="muted">{error}</p>
                </div>
              </td></tr>
            ) : filteredPayments.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <span className="icon">💳</span>
                  <p style={{ fontWeight: 600 }}>Sin pagos</p>
                  <p className="muted">No hay movimientos en esta categoría.</p>
                </div>
              </td></tr>
            ) : filteredPayments.map(payment => (
              <tr key={payment.id}>
                <td className="mono td-bold">{payment.id}</td>
                <td className="mono" style={{ color: 'var(--primary)', fontSize: 13 }}>{payment.trip_id ?? '—'}</td>
                <td style={{ fontSize: 13 }}>{payment.concept ?? 'Sin concepto'}</td>
                <td><Chip variant="default">{TYPE_LABELS[payment.type ?? ''] ?? 'Sin tipo'}</Chip></td>
                <td className="td-bold">{money(payment.amount)}</td>
                <td className="td-muted">
                  {payment.paid_at || payment.created_at
                    ? new Date(payment.paid_at ?? payment.created_at ?? '').toLocaleDateString('es-MX')
                    : '—'}
                </td>
                <td><Chip status={payment.status ?? undefined}>{STATUS_LABELS[payment.status ?? ''] ?? 'Sin estatus'}</Chip></td>
                <td>
                  <div className="td-actions">
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => showToast(`Detalle de ${payment.id}`)}>Ver</button>
                    {payment.status === 'pendiente' && (
                      <button className="btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}
                        disabled={processing === payment.id}
                        onClick={() => approvePayment(payment.id)}>
                        {processing === payment.id ? 'Aprobando…' : 'Aprobar'}
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

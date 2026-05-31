'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function PagosPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPayments() {
      const supabase = createClient()
      const { data } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
      
      setPayments(data || [])
      setLoading(false)
    }
    loadPayments()
  }, [])

  if (loading) return <div className="card">Cargando pagos...</div>

  return (
    <div style={{ padding: 20 }}>
      <div className="page-header">
        <h1 className="page-title">Pagos</h1>
        <p className="page-sub">{payments.length} registros</p>
      </div>

      {payments.length === 0 ? (
        <div className="card">No hay pagos registrados</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Tipo</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="mono">{p.id.slice(0, 8)}</td>
                  <td className="td-bold">${p.amount?.toLocaleString('es-MX')}</td>
                  <td>{p.status}</td>
                  <td>{p.type}</td>
                  <td className="td-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
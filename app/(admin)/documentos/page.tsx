'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function DocumentosPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDocuments() {
      const supabase = createClient()
      const { data } = await supabase
        .from('documents')
        .select('*, drivers(name)')
        .order('created_at', { ascending: false })
      
      setDocs(data || [])
      setLoading(false)
    }
    loadDocuments()
  }, [])

  if (loading) return <div className="card">Cargando documentos...</div>

  return (
    <div style={{ padding: 20 }}>
      <div className="page-header">
        <h1 className="page-title">Documentos</h1>
        <p className="page-sub">{docs.length} documentos</p>
      </div>

      {docs.length === 0 ? (
        <div className="card">No hay documentos subidos</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Archivo</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id}>
                  <td>{d.drivers?.name || '—'}</td>
                  <td>{d.type}</td>
                  <td>{d.status}</td>
                  <td className="td-muted">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td>
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                      Ver
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function UsuariosPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUsers() {
      const supabase = createClient()
      const { data } = await supabase
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false })
      
      setUsers(data || [])
      setLoading(false)
    }
    loadUsers()
  }, [])

  if (loading) return <div className="card">Cargando usuarios...</div>

  return (
    <div style={{ padding: 20 }}>
      <div className="page-header">
        <h1 className="page-title">Usuarios</h1>
        <p className="page-sub">{users.length} registrados</p>
      </div>

      {users.length === 0 ? (
        <div className="card">No hay usuarios registrados</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="td-bold">{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td className="td-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
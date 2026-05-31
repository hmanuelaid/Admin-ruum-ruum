'use client'
import { useEffect, useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { createClient } from '@/lib/supabase'

interface User {
  id: string
  name: string
  email: string
  phone: string
  type: string
  created_at: string
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    const supabase = createClient()
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false })
    
    setUsers(data ?? [])
    setLoading(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <div className="page-header">
        <h1 className="page-title">Usuarios</h1>
        <p className="page-sub">{users.length} registrados</p>
      </div>

      {loading ? (
        <div className="card">Cargando...</div>
      ) : users.length === 0 ? (
        <div className="card">No hay usuarios registrados</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Tipo</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td className="td-bold">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || '—'}</td>
                  <td><Chip>{user.type || 'usuario'}</Chip></td>
                  <td className="td-muted">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
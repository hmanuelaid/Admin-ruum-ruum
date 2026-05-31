'use client'
import { useEffect, useState } from 'react'
import { Chip } from '@/components/ui/Chip'  // ← asegurar import
import { createClient } from '@/lib/supabase'

interface Driver {
  id: string
  name: string
  email: string
  phone: string
  status: string
  certified: boolean
  rating: number
  trips_completed: number
  earnings: number
  created_at: string
}

export default function ConductoresPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDrivers()
  }, [])

  async function loadDrivers() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false })
    
    console.log('Drivers data:', data)  // ← ver en consola
    console.log('Error:', error)
    
    setDrivers(data ?? [])
    setLoading(false)
  }

  if (loading) return <div className="card">Cargando conductores...</div>

  return (
    <div style={{ padding: 20 }}>
      <div className="page-header">
        <h1 className="page-title">Conductores</h1>
        <p className="page-sub">{drivers.length} registrados</p>
      </div>

      {drivers.length === 0 ? (
        <div className="card">No hay conductores registrados</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Viajes</th>
                <th>Calificación</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(driver => (
                <tr key={driver.id}>
                  <td className="td-bold">{driver.name}</td>
                  <td>{driver.email}</td>
                  <td>{driver.phone || '—'}</td>
                  <td>
                    <span className={`chip chip-${driver.status === 'disponible' ? 'success' : 'warning'}`}>
                      {driver.status}
                    </span>
                  </td>
                  <td>{driver.trips_completed || 0}</td>
                  <td>{driver.rating || 0} ★</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
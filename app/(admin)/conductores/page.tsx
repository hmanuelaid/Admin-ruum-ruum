'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ConductoresPage() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDrivers() {
      try {
        console.log('1. Iniciando carga...')
        const supabase = createClient()
        console.log('2. Supabase cliente creado')
        
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
        
        console.log('3. Respuesta recibida:', { data, error })
        
        if (error) throw error
        setDrivers(data || [])
      } catch (err: any) {
        console.error('Error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadDrivers()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h1>Conductores - Diagnóstico</h1>
      
      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      <div style={{ background: '#f0f0f0', padding: 10, margin: 10 }}>
        <h3>Logs (ver consola F12):</h3>
        <p>1. Abre F12 → Console</p>
        <p>2. Recarga la página</p>
        <p>3. Mira los logs con números</p>
      </div>
      
      <h3>Datos encontrados: {drivers.length}</h3>
      
      {drivers.map(d => (
        <div key={d.id} style={{ border: '1px solid #ccc', margin: 5, padding: 10 }}>
          <strong>{d.name}</strong> - {d.email} - {d.status}
        </div>
      ))}
    </div>
  )
}
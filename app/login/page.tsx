'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function LoginPage() {
  const router = useRouter()
  const { setAdmin } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setError('')
    await new Promise(r => setTimeout(r, 700))
    if (password.length < 4) { setError('Credenciales incorrectas'); setLoading(false); return }
    setAdmin({ id: 'adm_001', name: 'Super Admin', email, role: 'super_admin' })
    router.replace('/dashboard')
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="logo-mark">R</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 18 }}>Ruum Ruum Admin</p>
            <p className="muted" style={{ fontSize: 12 }}>Panel operativo · MoviliaX</p>
          </div>
        </div>

        <div className="divider" />

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field-group">
            <label className="field-label">Correo electrónico</label>
            <input className="field-input" type="email" placeholder="admin@moviliax.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field-group">
            <label className="field-label">Contraseña</label>
            <input className="field-input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '.75rem' }} disabled={loading}>
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
          Acceso restringido al equipo MoviliaX
        </p>
      </div>
    </div>
  )
}
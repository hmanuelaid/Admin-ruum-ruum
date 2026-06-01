'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { isAdminRole } from '@/lib/auth/permissions'

export default function LoginPage() {
  const router = useRouter()
  const { setAdmin } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError('Credenciales incorrectas'); setLoading(false); return }

    // Buscar perfil en admin_users
    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, name, email, role')
      .eq('auth_id', data.user.id)
      .eq('active', true)
      .maybeSingle()

    if (!admin || !isAdminRole(admin.role)) {
      await supabase.auth.signOut()
      setError('No tienes acceso como administrador')
      setLoading(false)
      return
    }

    setAdmin({ id: admin.id, name: admin.name, email: admin.email, role: admin.role })
    const searchParams = new URLSearchParams(window.location.search)
    const nextPath = searchParams.get('next')
    router.replace(nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard')
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
          <button type="submit" className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '.75rem' }}
            disabled={loading}>
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

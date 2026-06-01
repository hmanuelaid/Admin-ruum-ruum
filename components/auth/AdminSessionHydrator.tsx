'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import type { AdminUser } from '@/lib/types'

type Props = {
  admin: AdminUser
}

export default function AdminSessionHydrator({ admin }: Props) {
  const setAdmin = useAuthStore(state => state.setAdmin)
  const logout = useAuthStore(state => state.logout)
  const router = useRouter()

  useEffect(() => {
    setAdmin(admin)
  }, [admin, setAdmin])

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        logout()
        router.replace('/login')
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [logout, router])

  return null
}

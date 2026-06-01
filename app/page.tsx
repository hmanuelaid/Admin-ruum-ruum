import { redirect } from 'next/navigation'
import { getVerifiedAdmin } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const admin = await getVerifiedAdmin()
  redirect(admin ? '/dashboard' : '/login')
}

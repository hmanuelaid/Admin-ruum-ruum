import Sidebar from '@/components/layout/SideBar'
import Topbar  from '@/components/layout/TopBar'
import Toast   from '@/components/ui/Toast'
import AdminSessionHydrator from '@/components/auth/AdminSessionHydrator'
import { getVerifiedAdmin } from '@/lib/auth/server'
import { getVisibleAdminNav } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getVerifiedAdmin()

  if (!admin) {
    redirect('/login')
  }

  const navGroups = getVisibleAdminNav(admin.role)

  return (
    <div className="admin-shell">
      <AdminSessionHydrator admin={admin} />
      <Sidebar navGroups={navGroups} />
      <Topbar admin={admin} />
      <main className="page-content">
        {children}
      </main>
      <Toast />
    </div>
  )
}

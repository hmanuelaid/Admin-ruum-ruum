import Sidebar from '@/components/layout/SideBar'
import Topbar  from '@/components/layout/TopBar'
import Toast   from '@/components/ui/Toast'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <Sidebar />
      <Topbar />
      <main className="page-content">
        {children}
      </main>
      <Toast />
    </div>
  )
}
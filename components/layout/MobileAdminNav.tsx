'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { VisibleAdminNavGroup } from '@/lib/auth/permissions'
import { ADMIN_NAV_ICONS } from './SideBar'

type Props = {
  navGroups: VisibleAdminNavGroup[]
}

export default function MobileAdminNav({ navGroups }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const navItems = useMemo(() => navGroups.flatMap(group => group.items), [navGroups])
  const bottomItems = navItems.slice(0, 4)

  if (navItems.length === 0) return null

  return (
    <>
      <button
        className="mobile-menu-button"
        aria-label="Abrir navegación"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>
        </svg>
      </button>

      {open && (
        <div className="mobile-nav-layer">
          <button className="mobile-nav-backdrop" aria-label="Cerrar navegación" onClick={() => setOpen(false)} />
          <aside className="mobile-nav-drawer" aria-label="Navegación móvil">
            <div className="mobile-nav-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="logo-mark">R</div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>Ruum Ruum</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Admin · MoviliaX</p>
                </div>
              </div>
              <button className="btn-icon" aria-label="Cerrar navegación" onClick={() => setOpen(false)}>×</button>
            </div>

            <nav className="mobile-drawer-nav">
              {navGroups.map(group => (
                <div key={group.group} className="sidebar-group">
                  <p className="sidebar-group-label">{group.group}</p>
                  {group.items.map(item => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`nav-item${active ? ' is-active' : ''}`}
                        onClick={() => setOpen(false)}
                      >
                        {ADMIN_NAV_ICONS[item.icon]}
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <nav className="mobile-bottom-nav" aria-label="Navegación principal móvil">
        {bottomItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`mobile-bottom-item${active ? ' is-active' : ''}`}
            >
              {ADMIN_NAV_ICONS[item.icon]}
              <span>{item.label}</span>
            </Link>
          )
        })}
        <button className="mobile-bottom-item" onClick={() => setOpen(true)} aria-label="Abrir más opciones de navegación">
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>
          </svg>
          <span>Más</span>
        </button>
      </nav>
    </>
  )
}

import type { AdminRole } from '@/lib/types'

export const ADMIN_ROLES = [
  'super_admin',
  'admin_operativo',
  'finanzas',
  'soporte',
  'validador',
  'comercial',
] as const satisfies readonly AdminRole[]

const ALL = ADMIN_ROLES
const OPS = ['super_admin', 'admin_operativo', 'soporte'] as const satisfies readonly AdminRole[]
const FIN = ['super_admin', 'admin_operativo', 'finanzas'] as const satisfies readonly AdminRole[]
const VAL = ['super_admin', 'admin_operativo', 'validador'] as const satisfies readonly AdminRole[]
const COM = ['super_admin', 'admin_operativo', 'comercial'] as const satisfies readonly AdminRole[]

export type AdminNavIcon =
  | 'dashboard'
  | 'trips'
  | 'users'
  | 'drivers'
  | 'evidence'
  | 'incidents'
  | 'payments'
  | 'documents'
  | 'tariffs'
  | 'companies'
  | 'reports'
  | 'settings'
  | 'activity'

type AdminNavItem = {
  href: string
  label: string
  icon: AdminNavIcon
  roles: readonly AdminRole[]
  badge?: number
}

type AdminNavGroup = {
  group: string
  items: readonly AdminNavItem[]
}

export type VisibleAdminNavItem = Omit<AdminNavItem, 'roles'>
export type VisibleAdminNavGroup = {
  group: string
  items: VisibleAdminNavItem[]
}

export type AdminAction =
  | 'dashboard.read'
  | 'companies.read'
  | 'companies.write'
  | 'config.read'
  | 'config.write'
  | 'documents.read'
  | 'payments.read'
  | 'trips.assign_driver'
  | 'trips.update_status'
  | 'documents.review'
  | 'documents.upload'
  | 'payments.update_status'
  | 'storage.read_documents'
  | 'storage.read_evidence'

const ADMIN_PERMISSION_MATRIX = [
  {
    group: 'Operación',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: ALL },
      { href: '/viajes', label: 'Viajes', icon: 'trips', roles: OPS },
      { href: '/usuarios', label: 'Usuarios', icon: 'users', roles: OPS },
      { href: '/conductores', label: 'Conductores', icon: 'drivers', roles: [...OPS, 'validador'] },
      { href: '/evidencia', label: 'Evidencia', icon: 'evidence', roles: [...OPS, 'validador'] },
      { href: '/incidencias', label: 'Incidencias', icon: 'incidents', roles: OPS },
    ],
  },
  {
    group: 'Finanzas',
    items: [
      { href: '/pagos', label: 'Pagos', icon: 'payments', roles: FIN },
      { href: '/documentos', label: 'Documentos', icon: 'documents', roles: [...FIN, ...VAL] },
      { href: '/tarifas', label: 'Tarifas', icon: 'tariffs', roles: FIN },
    ],
  },
  {
    group: 'Comercial',
    items: [
      { href: '/empresas', label: 'Empresas', icon: 'companies', roles: COM },
      { href: '/reportes', label: 'Reportes', icon: 'reports', roles: [...COM, ...FIN] },
    ],
  },
  {
    group: 'Sistema',
    items: [
      { href: '/configuracion', label: 'Configuración', icon: 'settings', roles: ['super_admin'] },
      { href: '/bitacora', label: 'Bitácora', icon: 'activity', roles: ['super_admin', 'admin_operativo'] },
    ],
  },
] as const satisfies readonly AdminNavGroup[]

type AdminRoutePermission = {
  prefix: string
  roles: readonly AdminRole[]
}

function hasRole(roles: readonly AdminRole[], role: AdminRole) {
  return roles.includes(role)
}

function getAdminRoutePermissions(): AdminRoutePermission[] {
  return ADMIN_PERMISSION_MATRIX.flatMap(group =>
    group.items.map(item => ({
      prefix: item.href,
      roles: item.roles,
    }))
  )
}

const ACTION_PERMISSIONS = {
  'dashboard.read': ALL,
  'companies.read': COM,
  'companies.write': COM,
  'config.read': ['super_admin'],
  'config.write': ['super_admin'],
  'documents.read': [...FIN, ...VAL],
  'payments.read': FIN,
  'trips.assign_driver': OPS,
  'trips.update_status': OPS,
  'documents.review': [...FIN, ...VAL],
  'documents.upload': [...FIN, ...VAL],
  'payments.update_status': FIN,
  'storage.read_documents': [...FIN, ...VAL],
  'storage.read_evidence': [...OPS, 'validador'],
} as const satisfies Record<AdminAction, readonly AdminRole[]>

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ADMIN_ROLES.includes(value as AdminRole)
}

export function getVisibleAdminNav(role: AdminRole): VisibleAdminNavGroup[] {
  return ADMIN_PERMISSION_MATRIX
    .map(group => ({
      group: group.group,
      items: group.items
        .filter(item => hasRole(item.roles, role))
        .map(item => {
          const visibleItem: VisibleAdminNavItem = {
            href: item.href,
            label: item.label,
            icon: item.icon,
          }

          if ('badge' in item && typeof item.badge === 'number') {
            visibleItem.badge = item.badge
          }

          return visibleItem
        }),
    }))
    .filter(group => group.items.length > 0)
}

export function getRequiredAdminRoles(pathname: string): readonly AdminRole[] | null {
  const match = getAdminRoutePermissions()
    .filter(route => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]

  return match?.roles ?? null
}

export function canAccessAdminPath(role: AdminRole, pathname: string) {
  const requiredRoles = getRequiredAdminRoles(pathname)
  return !requiredRoles || hasRole(requiredRoles, role)
}

export function canPerformAdminAction(role: AdminRole, action: AdminAction) {
  return hasRole(ACTION_PERMISSIONS[action], role)
}

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function exists(path) {
  return existsSync(join(root, path))
}

const empresas = read(join('app', '(admin)', 'empresas', 'page.tsx'))
const permissions = read(join('lib', 'auth', 'permissions.ts'))
const migration = read(join('supabase', 'migrations', '20260601050000_admin_companies.sql'))
const companiesRoute = read(join('app', 'api', 'admin', 'companies', 'route.ts'))
const companyIdRoute = read(join('app', 'api', 'admin', 'companies', '[id]', 'route.ts'))
const layout = read(join('app', '(admin)', 'layout.tsx'))
const topbar = read(join('components', 'layout', 'TopBar.tsx'))
const sidebar = read(join('components', 'layout', 'SideBar.tsx'))
const mobileNav = read(join('components', 'layout', 'MobileAdminNav.tsx'))
const css = read(join('app', 'globals.css'))

const checks = [
  ['companies migration exists', exists(join('supabase', 'migrations', '20260601050000_admin_companies.sql'))],
  ['companies table is created', /create table if not exists public\.companies/.test(migration)],
  ['companies RLS is enabled', /alter table public\.companies enable row level security/.test(migration)],
  ['companies policies are role based', /current_admin_role\(\) in \('super_admin', 'admin_operativo', 'comercial'\)/.test(migration)],
  ['companies summary RPC exists', /create or replace function public\.get_admin_companies_summary/.test(migration)],
  ['companies permissions exist', permissions.includes("'companies.read'") && permissions.includes("'companies.write'")],
  ['companies list API exists', exists(join('app', 'api', 'admin', 'companies', 'route.ts'))],
  ['companies id API exists', exists(join('app', 'api', 'admin', 'companies', '[id]', 'route.ts'))],
  ['companies list API authorizes reads and writes', companiesRoute.includes("authorizeAdminAction('companies.read')") && companiesRoute.includes("authorizeAdminAction('companies.write')")],
  ['companies id API authorizes writes', companyIdRoute.includes("authorizeAdminAction('companies.write')")],
  ['empresas page no longer imports mock data', !/mockCompanies|mock-data/.test(empresas)],
  ['empresas page uses companies API', empresas.includes('/api/admin/companies')],
  ['empresas page includes create and edit flows', empresas.includes('openCreate') && empresas.includes('openEdit') && empresas.includes('handleSave')],
  ['empresas page includes status and delete actions', empresas.includes('handleStatusToggle') && empresas.includes('handleDelete')],
  ['layout passes verified nav to topbar', layout.includes('<Topbar admin={admin} navGroups={navGroups} />')],
  ['topbar renders mobile nav', topbar.includes('MobileAdminNav') && topbar.includes('navGroups')],
  ['sidebar exports reusable icons', sidebar.includes('export const ADMIN_NAV_ICONS')],
  ['mobile nav component exists', exists(join('components', 'layout', 'MobileAdminNav.tsx'))],
  ['mobile nav has drawer and bottom nav', mobileNav.includes('mobile-nav-drawer') && mobileNav.includes('mobile-bottom-nav')],
  ['mobile nav uses verified nav groups', mobileNav.includes('navGroups.flatMap') && !mobileNav.includes('useAuthStore')],
  ['mobile CSS shows nav under 640px', /@media \(max-width: 640px\)[\s\S]*\.mobile-menu-button[\s\S]*display: grid/.test(css)],
  ['mobile CSS includes bottom navigation', /\.mobile-bottom-nav[\s\S]*position: fixed[\s\S]*grid-template-columns: repeat\(5/.test(css)],
  ['mobile page content accounts for bottom nav', /\.page-content \{ grid-column: 1; padding: 16px 12px 86px; \}/.test(css)],
]

const failures = checks.filter(([, ok]) => !ok)

if (failures.length > 0) {
  console.error('Admin companies and mobile nav checks failed:')
  for (const [label] of failures) console.error(`- ${label}`)
  process.exit(1)
}

console.log('Admin companies and mobile nav checks passed.')

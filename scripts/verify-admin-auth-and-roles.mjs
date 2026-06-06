import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function exists(path) {
  return existsSync(join(root, path))
}

const proxy = read('proxy.ts')
const permissions = read(join('lib', 'auth', 'permissions.ts'))
const authServer = read(join('lib', 'auth', 'server.ts'))
const adminActions = read(join('lib', 'api', 'admin-actions.ts'))
const adminLayout = read(join('app', '(admin)', 'layout.tsx'))
const sidebar = read(join('components', 'layout', 'SideBar.tsx'))
const packageJson = JSON.parse(read('package.json'))
const unassignedTripsJobPath = join('app', 'api', 'admin', 'jobs', 'unassigned-trips', 'route.ts')
const unassignedTripsJob = exists(unassignedTripsJobPath) ? read(unassignedTripsJobPath) : ''
const documentExpiryJobPath = join('app', 'api', 'admin', 'jobs', 'document-expiry', 'route.ts')
const documentExpiryJob = exists(documentExpiryJobPath) ? read(documentExpiryJobPath) : ''

const apiRoutes = [
  [join('app', 'api', 'admin', 'dashboard', 'route.ts'), 'dashboard.read'],
  [join('app', 'api', 'admin', 'companies', 'route.ts'), 'companies.read'],
  [join('app', 'api', 'admin', 'companies', '[id]', 'route.ts'), 'companies.write'],
  [join('app', 'api', 'admin', 'documents', 'route.ts'), 'documents.read'],
  [join('app', 'api', 'admin', 'payments', 'route.ts'), 'payments.read'],
  [join('app', 'api', 'admin', 'trips', 'assign-driver', 'route.ts'), 'trips.assign_driver'],
  [join('app', 'api', 'admin', 'trips', 'status', 'route.ts'), 'trips.update_status'],
  [join('app', 'api', 'admin', 'documents', 'review', 'route.ts'), 'documents.review'],
  [join('app', 'api', 'admin', 'payments', 'status', 'route.ts'), 'payments.update_status'],
  [join('app', 'api', 'admin', 'storage', 'documents', 'route.ts'), 'documents.upload'],
  [join('app', 'api', 'admin', 'storage', 'evidence', 'route.ts'), 'storage.read_evidence'],
  [join('app', 'api', 'admin', 'storage', 'signed-urls', 'route.ts'), null],
]

const apiRouteChecks = apiRoutes.flatMap(([path, action]) => {
  const source = exists(path) ? read(path) : ''
  const checks = [
    [`${path} exists`, exists(path)],
    [`${path} authorizes admin session`, source.includes('authorizeAdminAction')],
  ]

  if (action) {
    checks.push([`${path} checks ${action}`, source.includes(`authorizeAdminAction('${action}')`)])
  } else {
    checks.push([
      `${path} validates bucket-specific storage permissions`,
      source.includes('storage.read_documents') && source.includes('storage.read_evidence'),
    ])
  }

  return checks
})

const checks = [
  ['test script exists', typeof packageJson.scripts?.test === 'string' && packageJson.scripts.test.includes('test:security') && packageJson.scripts.test.includes('test:routes')],
  ['typecheck script exists', packageJson.scripts?.typecheck === 'tsc --noEmit'],
  ['high audit script exists', packageJson.scripts?.['audit:high'] === 'npm audit --audit-level=high'],
  ['postcss override is patched', /^8\.5\.(1[0-9]|[2-9][0-9])$/.test(packageJson.overrides?.postcss ?? '')],
  ['proxy exists', exists('proxy.ts')],
  ['proxy uses Supabase SSR client', proxy.includes("from '@supabase/ssr'") && proxy.includes('createServerClient')],
  ['proxy validates server user', /auth\.getUser\(\)/.test(proxy)],
  ['proxy requires active admin user', /\.from\('admin_users'\)[\s\S]*\.eq\('active', true\)/.test(proxy)],
  ['proxy uses centralized route permissions', proxy.includes('getRequiredAdminRoles') && proxy.includes('canAccessAdminPath')],
  ['proxy redirects unauthenticated admins to login', proxy.includes("new URL('/login'") && proxy.includes("searchParams.set('next'")],
  ['server auth validates getUser', /auth\.getUser\(\)/.test(authServer)],
  ['server auth requires active admin user', /\.from\('admin_users'\)[\s\S]*\.eq\('active', true\)/.test(authServer)],
  ['permissions include admin_operativo', permissions.includes("'admin_operativo'")],
  ['permissions include soporte', permissions.includes("'soporte'")],
  ['permissions do not use legacy operaciones role', !permissions.includes("'operaciones'") && !sidebar.includes("'operaciones'")],
  ['permissions define route matrix', permissions.includes('ADMIN_PERMISSION_MATRIX') && permissions.includes('getRequiredAdminRoles')],
  ['permissions define action matrix', permissions.includes('ACTION_PERMISSIONS') && permissions.includes('canPerformAdminAction')],
  ['admin actions centralize authorization', adminActions.includes('getVerifiedAdmin') && adminActions.includes('canPerformAdminAction')],
  ['admin layout verifies session server-side', adminLayout.includes('await getVerifiedAdmin()') && adminLayout.includes("redirect('/login')")],
  ['admin layout passes verified nav groups to sidebar', adminLayout.includes('getVisibleAdminNav(admin.role)') && adminLayout.includes('<Sidebar navGroups={navGroups} />')],
  ['sidebar only renders provided nav groups', sidebar.includes('navGroups: VisibleAdminNavGroup[]') && sidebar.includes('if (navGroups.length === 0) return null')],
  ['sidebar does not read client auth store', !sidebar.includes('useAdminStore')],
  ['unassigned trips job route exists', exists(unassignedTripsJobPath)],
  [
    'unassigned trips job authorizes before service operations',
    unassignedTripsJob.indexOf('if (!isAuthorized(req))') !== -1 &&
      unassignedTripsJob.indexOf('if (!isAuthorized(req))') < unassignedTripsJob.indexOf('const supabase = createSupabaseServiceClient()') &&
      unassignedTripsJob.indexOf('if (!isAuthorized(req))') < unassignedTripsJob.indexOf("rpc('check_unassigned_trips'"),
  ],
  ['unassigned trips job uses cron secret', unassignedTripsJob.includes('process.env.CRON_SECRET')],
  ['unassigned trips job calls check_unassigned_trips RPC', unassignedTripsJob.includes("rpc('check_unassigned_trips'")],
  ['unassigned trips cron is configured', exists('vercel.json') && read('vercel.json').includes('/api/admin/jobs/unassigned-trips')],
  ['document expiry job route exists', exists(documentExpiryJobPath)],
  [
    'document expiry job authorizes before service operations',
    documentExpiryJob.indexOf('if (!isAuthorized(req))') !== -1 &&
      documentExpiryJob.indexOf('if (!isAuthorized(req))') < documentExpiryJob.indexOf('const supabase = createSupabaseServiceClient()') &&
      documentExpiryJob.indexOf('if (!isAuthorized(req))') < documentExpiryJob.indexOf("rpc('expire_overdue_documents'"),
  ],
  ['document expiry job uses cron secret', documentExpiryJob.includes('process.env.CRON_SECRET')],
  ['document expiry job expires documents before notification toggle', documentExpiryJob.indexOf("rpc('expire_overdue_documents'") !== -1 && documentExpiryJob.indexOf("rpc('expire_overdue_documents'") < documentExpiryJob.indexOf("item.key === 'notif_doc_vencido'")],
  ['document expiry job calls expiring documents RPC', documentExpiryJob.includes("rpc('get_expiring_driver_documents'")],
  ['document expiry cron is configured', exists('vercel.json') && read('vercel.json').includes('/api/admin/jobs/document-expiry')],
  ['cron env vars are documented', read('.env.example').includes('CRON_SECRET=') && read('.env.example').includes('SUPABASE_SERVICE_ROLE_KEY=')],
  ...apiRouteChecks,
]

const failures = checks.filter(([, ok]) => !ok)

if (failures.length > 0) {
  console.error('Admin auth and role checks failed:')
  for (const [label] of failures) console.error(`- ${label}`)
  process.exit(1)
}

console.log('Admin auth and role checks passed.')
